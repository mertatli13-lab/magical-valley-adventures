"""Rig and animate a four-legged plush character (Ginza, later Sugar) in Blender.

Runs with Blender's Python module (pip install bpy==4.5.3 into a Python 3.11 venv):

    python -I scripts/rig-quadruped.py -- art/meshy/ginza.glb art/models/characters/ginza.glb \
        --character ginza [--previews <dir>]

The input is an unrigged Meshy model prepared by scripts/prep-meshy.py (feet at y = 0).
The script:
- turns the body so it faces straight ahead, centres the feet on the origin and
  reduces the mesh to the triangle budget in docs/design.md (8,000);
- builds a 19-bone skeleton from the joint positions in SKELETONS (spec: 30 bones
  at most, 4 influences per vertex) and skins the mesh by distance to the bones;
- adds the acc_head, acc_neck and acc_back attach empties;
- keys the eight clips from the asset spec at 30 fps: Idle, Run (a gallop),
  Jump, Slide (body under 0.6 m), Hit, Out, Celebrate and Signature (Ginza's
  clumsy tumble, rolling through as a ball, or Sugar's rainbow dash, a low skid);
- exports a GLB for npm run optimize:models, and optionally preview renders.
"""
import functools
import math
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

print = functools.partial(print, flush=True)  # noqa: A001 - keep output in order with Blender's own

FPS = 30
MAX_TRIANGLES = 7800
SLIDE_MAX_HEIGHT = 0.6  # asset spec: the body stays under 0.6 m while sliding
UNDER_BARRIER = 0.9  # high barriers leave 0.9 m clear, so the tumble ball must stay below it
TAU = math.tau
LEGS = ('FrontLeg.L', 'FrontLeg.R', 'BackLeg.L', 'BackLeg.R')


def shin(leg):
    return leg.replace('Leg', 'Shin')


# ---------------------------------------------------------------- loading


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    mesh = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    world = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.data.transform(world)
    mesh.matrix_world = Matrix.Identity(4)
    for o in list(bpy.context.scene.objects):
        if o != mesh:
            bpy.data.objects.remove(o)
    mesh.name = 'Body'
    return mesh


def verts(mesh):
    return np.array([v.co[:] for v in mesh.data.vertices])


def straighten(mesh):
    """Turn the body's long axis onto Y (head toward -Y, the glTF +Z the game expects) and centre the feet."""
    V = verts(mesh)
    H = V[:, 2].max()
    mid = V[(V[:, 2] > 0.35 * H) & (V[:, 2] < 0.6 * H)][:, :2]
    c = mid - mid.mean(0)
    _, vec = np.linalg.eigh(c.T @ c)
    axis = vec[:, -1]
    head = V[V[:, 2] > 0.8 * H][:, :2].mean(0) - V[:, :2].mean(0)
    if axis @ head > 0:
        axis = -axis  # point to the tail
    angle = math.atan2(axis[0], axis[1])
    mesh.data.transform(Matrix.Rotation(angle, 4, 'Z'))
    V = verts(mesh)
    feet = V[V[:, 2] < 0.08 * V[:, 2].max()]
    centre = (feet.min(0) + feet.max(0)) / 2
    mesh.data.transform(Matrix.Translation((-centre[0], -centre[1], -V[:, 2].min())))
    print(f'turned {math.degrees(angle):.1f} degrees to face forward')


def decimate(mesh, target):
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    if tris <= target:
        return
    mod = mesh.modifiers.new('decimate', 'DECIMATE')
    mod.ratio = target / tris
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f'triangles {tris} -> {sum(len(p.vertices) - 2 for p in mesh.data.polygons)}')


# ---------------------------------------------------------------- skeleton

# Joint positions in metres, after straighten() (head toward -Y, left side toward +X,
# feet on z = 0). Measured from orthographic side and front renders of the
# straightened model on a 10 cm grid.
SKELETONS = {
    'ginza': {
        'belly': 0.31, 'back': 0.61, 'torso': (0.0, 0.46), 'chest': (-0.24, 0.46), 'rump': (0.26, 0.48),
        'neck': ((-0.13, 0.55), (-0.19, 0.76)), 'muzzle': (-0.45, 0.72),
        'ears': {'L': ((0.13, -0.16, 0.96), (0.15, -0.15, 1.10)), 'R': ((-0.10, -0.16, 0.96), (-0.11, -0.15, 1.10))},
        'mane': ((0.02, -0.20, 0.98), (0.02, -0.22, 1.13)),
        'signature': 'tumble',
        'tail': ((0.0, 0.28, 0.58), (0.0, 0.39, 0.53), (0.0, 0.46, 0.43)),
        'feet': {'FrontLeg.L': (0.12, -0.15), 'FrontLeg.R': (-0.11, -0.20), 'BackLeg.L': (0.17, 0.19), 'BackLeg.R': (-0.17, 0.24)},
        'leg_top': 0.42, 'knee': 0.2,
        'head_top': 1.0, 'head_half_width': 0.2,
    },
    # Sugar's head is turned a little toward her left, so the neck, head, ears and
    # horn sit to the +X side; her long mane hangs down her right side.
    'sugar': {
        'belly': 0.30, 'back': 0.54, 'torso': (0.0, 0.42), 'chest': (-0.26, 0.42), 'rump': (0.26, 0.44),
        'neck': ((0.0, -0.15, 0.50), (0.04, -0.17, 0.72)), 'muzzle': (0.15, -0.37, 0.66),
        'ears': {'L': ((0.13, -0.12, 0.93), (0.13, -0.11, 1.06)), 'R': ((-0.03, -0.13, 0.93), (-0.03, -0.12, 1.06))},
        # The horn gets a bone of its own that is never animated, so it stays rigid on the
        # head instead of following the ear beside it.
        'horn': ((0.16, -0.28, 0.94), (0.24, -0.35, 1.13)),
        'mane': ((-0.02, -0.12, 0.98), (-0.16, -0.10, 0.70), (-0.22, -0.10, 0.38)),
        'tail': ((0.0, 0.25, 0.51), (0.0, 0.37, 0.45), (0.0, 0.42, 0.26)),
        'feet': {'FrontLeg.L': (0.175, -0.142), 'FrontLeg.R': (-0.056, -0.221), 'BackLeg.L': (0.087, 0.212), 'BackLeg.R': (-0.171, 0.177)},
        'leg_top': 0.38, 'knee': 0.19,
        'head_top': 0.98, 'head_half_width': 0.17, 'head_x': 0.08,
        'signature': 'skid',
        # Her horn stands up, so she keeps her head level to stay low in the slide and the skid.
        'tune': {'slide': {'Head': -0.2}, 'skid': {'Head': 0.3, 'Mane': 0.3, 'Ear.L': -1.4, 'Ear.R': -1.4}},
    },
}


# Per-character adjustments to the shared poses, set from SKELETONS in main().
TUNE = {}


def p3(point):
    """A joint as (x, y, z); points given as (y, z) sit on the middle line."""
    return tuple(point) if len(point) == 3 else (0.0, *point)


def build_armature(S):
    data = bpy.data.armatures.new('Armature')
    rig = bpy.data.objects.new('Armature', data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = data.edit_bones

    def bone(name, head, tail, parent=None, deform=True):
        b = eb.new(name)
        b.head, b.tail = Vector(head), Vector(tail)
        if parent:
            b.parent = eb[parent]
        b.use_deform = deform
        # Local X along world X for every bone, so a rotation about local X is a
        # pitch: positive tips a bone's end toward +Y (back) and, for bones pointing
        # forward, down.
        direction = (b.tail - b.head).normalized()
        b.align_roll(Vector((1, 0, 0)).cross(direction))
        return b

    ty, tz = S['torso']
    bone('Root', (0, 0, 0), (0, 0, 0.1), deform=False)
    bone('Body', (0, ty, tz), (0, ty, tz + 0.1), 'Root', deform=False)
    bone('Hips', (0, ty, tz), (0, *S['rump']), 'Body')
    bone('Chest', (0, ty, tz), (0, *S['chest']), 'Body')
    neck_base, head_base = (p3(q) for q in S['neck'])
    bone('Neck', neck_base, head_base, 'Chest')
    bone('Head', head_base, p3(S['muzzle']), 'Neck')
    for side, (base, tip) in S['ears'].items():
        bone('Ear.' + side, base, tip, 'Head')
    if 'horn' in S:
        bone('Horn', *S['horn'], 'Head')
    # The mane is a chain: Mane, Mane2, ... from the top of the head.
    mane = S['mane']
    for i in range(len(mane) - 1):
        name = 'Mane' if i == 0 else f'Mane{i + 1}'
        bone(name, mane[i], mane[i + 1], 'Head' if i == 0 else ('Mane' if i == 1 else f'Mane{i}'))
    t0, t1, t2 = S['tail']
    bone('Tail1', t0, t1, 'Hips')
    bone('Tail2', t1, t2, 'Tail1')
    for leg, (x, y) in S['feet'].items():
        parent = 'Chest' if leg.startswith('Front') else 'Hips'
        bone(leg, (x, y, S['leg_top']), (x, y, S['knee']), parent)
        bone(shin(leg), (x, y, S['knee']), (x, y, 0.02), leg)
    bpy.ops.object.mode_set(mode='OBJECT')
    print(f'{len(data.bones)} bones')
    return rig


def segment_distance(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def skin(mesh, rig, softness=0.04, influences=4):
    """Weights from distance: each vertex follows its nearest bones, blended over a few centimetres.
    Meshy meshes are split along every texture seam, which defeats Blender's bone-heat
    weights; distance weights only need positions, so split vertices move together."""
    P = verts(mesh)
    bones = [b for b in rig.data.bones if b.use_deform]
    D = np.stack([segment_distance(P, np.array(b.head_local), np.array(b.tail_local)) for b in bones], 1)
    W = np.exp(-(D - D.min(1, keepdims=True)) / softness)
    keep = np.argsort(-W, 1)[:, :influences]
    mask = np.zeros_like(W, dtype=bool)
    np.put_along_axis(mask, keep, True, 1)
    W = np.where(mask, W, 0)
    W /= W.sum(1, keepdims=True)
    groups = [mesh.vertex_groups.new(name=b.name) for b in bones]
    for j, group in enumerate(groups):
        for i in np.nonzero(W[:, j] > 1e-3)[0]:
            group.add([int(i)], float(W[i, j]), 'REPLACE')
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig
    mesh.parent = rig
    print(f'skinned {len(P)} vertices to {len(bones)} bones')


def attach_points(rig, S):
    """acc_head on top of the head, acc_neck at the collar, acc_back on the back (asset spec)."""
    nx, ny, nz = p3(S['neck'][0])
    hy = (p3(S['neck'][1])[1] + p3(S['muzzle'])[1]) / 2
    points = {
        'acc_head': ('Head', (S.get('head_x', 0), hy + 0.08, S['head_top'])),
        'acc_neck': ('Neck', (nx, ny - 0.02, nz + 0.04)),
        'acc_back': ('Hips', (0, S['torso'][0] + 0.04, S['back'])),
    }
    for name, (bone, at) in points.items():
        empty = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(empty)
        empty.parent = rig
        empty.parent_type = 'BONE'
        empty.parent_bone = bone
        bpy.context.view_layer.update()
        # Accessories are drawn with -z toward the face; the face is toward glTF +z (Blender -Y),
        # so each empty is turned half a turn about the vertical.
        empty.matrix_world = Matrix.Translation(Vector(at)) @ Matrix.Rotation(math.pi, 4, 'Z')


# ---------------------------------------------------------------- posing


REST = {'squash': 1.0}


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def keyed(keys, frame):
    """Blend between (frame, {channel: value}) keys with smooth easing."""
    for (f0, a), (f1, b) in zip(keys, keys[1:]):
        if f0 <= frame <= f1:
            t = smooth((frame - f0) / max(1e-6, f1 - f0))
            return {k: a.get(k, REST.get(k, 0)) + (b.get(k, REST.get(k, 0)) - a.get(k, REST.get(k, 0))) * t for k in set(a) | set(b)}
    return dict(keys[-1][1])


def apply_pose(rig, pose):
    """pose: {'Bone': pitch} or {'Bone.x/y/z': angle} for rotations, {'lift'/'shift'} for the Body position."""
    for pb in rig.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bones = rig.data.bones
    # Poses give the mane's pitch for a tuft that stands up (negative streams it back);
    # a mane that hangs down turns the other way.
    mane_sign = 1 if bones['Mane'].tail_local.z > bones['Mane'].head_local.z else -1
    for key, value in pose.items():
        if key in ('lift', 'shift', 'squash'):
            continue
        name, _, axis = key.partition(':')
        if name not in rig.pose.bones:
            continue
        index = 'xyz'.index(axis or 'x')
        if name == 'Mane' and index == 0:
            value *= mane_sign
        rig.pose.bones[name].rotation_euler[index] += value
        # Further mane bones follow through with a little less of the same motion.
        if name == 'Mane':
            for i, follow in enumerate(b for b in ('Mane2', 'Mane3') if b in rig.pose.bones):
                rig.pose.bones[follow].rotation_euler[index] += value * 0.6 ** (i + 1)
    # Body points up: its local Y is world Z and its local Z is world -Y.
    body = rig.pose.bones['Body']
    body.location = (0, pose.get('lift', 0), -pose.get('shift', 0))
    body.scale = (pose.get('squash', 1.0),) * 3


def lowest_point(mesh):
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    low = min(v.co.z for v in evaluated.to_mesh().vertices)
    evaluated.to_mesh_clear()
    return low


def bake(rig, name, frames, pose_at, loop, mesh=None, grounded=()):
    """Key a clip. On `grounded` frames the body is lifted or lowered so the lowest point touches the ground."""
    action = bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action = action
    for f in range(frames + 1):
        pose = pose_at(f % frames if loop else f)
        apply_pose(rig, pose)
        if mesh is not None and f in grounded:
            for _ in range(2):  # the second pass absorbs the small change scale makes to the lift
                pose['lift'] = pose.get('lift', 0) - lowest_point(mesh)
                apply_pose(rig, pose)
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler', frame=f, group=pb.name)
            if pb.name == 'Body':
                pb.keyframe_insert('location', frame=f, group=pb.name)
                pb.keyframe_insert('scale', frame=f, group=pb.name)
    action.use_frame_range = True
    action.frame_start, action.frame_end = 0, frames
    action.use_fake_user = True
    rig.animation_data.action = None
    return action


def idle(f, n=60):
    p = TAU * f / n
    return {
        'lift': 0.008 * math.sin(2 * p),
        'Chest': 0.02 * math.sin(2 * p),
        'Neck': 0.06 * math.sin(p),
        'Head': -0.05 * math.sin(p + 1),
        'Head:z': 0.08 * math.sin(p * 0.5 * 2),
        'Ear.L': 0.25 * max(0.0, math.sin(2 * p)) ** 4,
        'Ear.R': 0.25 * max(0.0, math.sin(2 * p + 2)) ** 4,
        'Tail1:z': 0.25 * math.sin(p),
        'Tail2:z': 0.3 * math.sin(p - 0.8),
        'Mane:z': 0.12 * math.sin(p - 0.4),
    }


def run(f, n=16):
    """A bouncy gallop: back legs push together, then the front legs reach, with one moment of flight."""
    p = TAU * f / n
    pose = {
        'lift': 0.035 * (1 + math.sin(p + 0.6)),
        'Body': 0.1 * math.sin(p + math.pi / 2),
        'Neck': -0.14 * math.sin(p + math.pi / 2),
        'Head': 0.08 * math.sin(p),
        'Ear.L': -0.35 - 0.15 * math.sin(2 * p),
        'Ear.R': -0.35 - 0.15 * math.sin(2 * p + 0.5),
        'Mane': -0.3 - 0.2 * math.sin(2 * p),
        'Tail1': 0.5 + 0.2 * math.sin(p),
        'Tail2': 0.2 + 0.25 * math.sin(p - 0.7),
    }
    phase = {'BackLeg.L': 0.0, 'BackLeg.R': 0.5, 'FrontLeg.L': math.pi, 'FrontLeg.R': math.pi + 0.5}
    for leg, offset in phase.items():
        swing = math.sin(p + offset)  # +1: leg back, -1: leg forward
        pose[leg] = 0.65 * swing
        # The shin folds while the leg comes forward, and stays straight while it pushes.
        fold = max(0.0, -math.cos(p + offset))
        pose[shin(leg)] = (1.2 if leg.startswith('Front') else 0.9) * fold
    return pose


def tucked(front=1.0, back=1.0):
    """Legs folded under the body."""
    pose = {}
    for leg in LEGS:
        k = front if leg.startswith('Front') else back
        pose[leg] = (0.5 if leg.startswith('Front') else -0.7) * k
        pose[shin(leg)] = (1.9 if leg.startswith('Front') else 1.7) * k
    return pose


def jump(f):
    keys = [
        (0, {'Body': -0.2, 'BackLeg.L': 0.6, 'BackLeg.R': 0.6, 'FrontLeg.L': -0.6, 'FrontLeg.R': -0.6,
             'FrontShin.L': 1.2, 'FrontShin.R': 1.2, 'Tail1': 0.6, 'Ear.L': -0.4, 'Ear.R': -0.4}),
        (5, {**tucked(), 'Body': -0.1, 'Neck': -0.15, 'Tail1': 0.7, 'Tail2': 0.3, 'Ear.L': -0.6, 'Ear.R': -0.6, 'Mane': -0.4}),
        (11, {**tucked(0.8, 0.8), 'Body': 0.05, 'Tail1': 0.5, 'Ear.L': -0.5, 'Ear.R': -0.5, 'Mane': -0.3}),
        (17, {'Body': 0.15, 'FrontLeg.L': -0.35, 'FrontLeg.R': -0.3, 'BackLeg.L': 0.3, 'BackLeg.R': 0.3,
              'Neck': 0.1, 'Tail1': 0.3, 'Ear.L': -0.2, 'Ear.R': -0.2}),
    ]
    return keyed(keys, f)


def lying(drop):
    """Belly slide: flat on the tummy, front legs stretched forward, back legs stretched back, chin forward."""
    return {'lift': -drop, 'Body': 0.0,
            'FrontLeg.L': -1.45, 'FrontLeg.R': -1.4, 'FrontShin.L': 0.1, 'FrontShin.R': 0.15,
            'BackLeg.L': 1.4, 'BackLeg.R': 1.45, 'BackShin.L': 0.1, 'BackShin.R': 0.05,
            'Neck': 1.5, 'Head': -0.6, 'Ear.L': -1.4, 'Ear.R': -1.4, 'Mane': 0.2, 'Tail1': -0.1, 'Tail2': 0.25,
            **TUNE.get('slide', {})}


def slide(f, drop):
    flat = lying(drop)
    # The legs spread a moment before the body drops, so the hooves never dip into the ground.
    spread = {k: (v if 'Leg' in k or 'Shin' in k else 0.3 * v) for k, v in flat.items()}
    keys = [(0, {}), (2, spread), (4, flat), (21, {**flat, 'Tail1:z': 0.3, 'Head:z': 0.1})]
    return keyed(keys, f)


def hit(f):
    keys = [
        (0, {}),
        (3, {'Body': -0.25, 'Neck': -0.45, 'Head': -0.2, 'FrontLeg.L': -0.4, 'FrontLeg.R': -0.2,
             'Ear.L': -0.9, 'Ear.R': -0.9, 'Tail1': -0.4, 'Body:y': 0.15}),
        (8, {'Body': 0.1, 'Neck': 0.2, 'FrontLeg.L': 0.3, 'Body:y': -0.1, 'Ear.L': -0.5, 'Ear.R': -0.5}),
        (14, {}),
    ]
    return keyed(keys, f)


def out(f):
    sit = {'lift': -0.18, 'shift': 0.08, 'Body': -0.55, 'FrontLeg.L': 0.55, 'FrontLeg.R': 0.55,
           'BackLeg.L': -1.0, 'BackLeg.R': -1.0, 'BackShin.L': 1.6, 'BackShin.R': 1.6,
           'Neck': 0.25, 'Ear.L': -0.8, 'Ear.R': -0.8, 'Tail1': -0.3}
    pose = keyed([(0, {}), (14, sit), (44, sit)], f)
    dizzy = smooth((f - 10) / 10)
    pose['Head:z'] = pose.get('Head:z', 0) + dizzy * 0.25 * math.sin(TAU * f / 22)
    pose['Neck:y'] = pose.get('Neck:y', 0) + dizzy * 0.18 * math.sin(TAU * f / 22 + 1)
    return pose


def celebrate(f, n=60):
    rear = {'Body': -0.75, 'lift': 0.05, 'BackLeg.L': -0.55, 'BackLeg.R': -0.55, 'BackShin.L': 0.4, 'BackShin.R': 0.4,
            'Neck': 0.3, 'Tail1': 0.2, 'Ear.L': 0.1, 'Ear.R': 0.1}
    pose = keyed([(0, {}), (14, rear), (38, rear), (52, {'lift': 0.06}), (60, {})], f)
    up = smooth(f / 14) * (1 - smooth((f - 38) / 14))
    for leg, offset in (('FrontLeg.L', 0), ('FrontLeg.R', math.pi)):
        pose[leg] = pose.get(leg, 0) + up * (-0.9 + 0.45 * math.sin(TAU * f / 12 + offset))
        pose[shin(leg)] = up * (1.0 + 0.4 * math.sin(TAU * f / 12 + offset + 1))
    pose['Tail1:z'] = 0.35 * math.sin(TAU * f / 20)
    pose['Head:z'] = 0.12 * math.sin(TAU * f / 30)
    return pose


def tumble(f, ball_drop, slide_drop):
    """Clumsy tumble: trips over the front legs, curls up and rolls once through as a squashed purple ball."""
    ball = {**tucked(1.1, 1.1), 'lift': -ball_drop, 'squash': 0.62, 'Neck': 1.3, 'Head': 0.6,
            'Ear.L': -1.4, 'Ear.R': -1.4, 'Tail1': 0.8, 'Tail2': 0.6, 'Mane': -1.6}
    trip = {'Body': 0.45, 'lift': -0.1, 'FrontLeg.L': 0.6, 'FrontLeg.R': 0.5, 'FrontShin.L': 1.2, 'FrontShin.R': 1.0,
            'Neck': 0.5, 'Ear.L': -0.6, 'Ear.R': -0.6}
    if f <= 4:
        return keyed([(0, {}), (4, trip)], f)
    if f <= 17:
        pose = keyed([(4, trip), (7, ball), (17, ball)], f)
        pose['Body'] = 0.45 + (TAU - 0.45) * (f - 4) / 13  # one full forward roll
        return pose
    return keyed([(17, {**ball, 'Body': TAU}), (21, {**lying(slide_drop), 'Body': TAU})], f)


def skid(f, drop):
    """Rainbow dash: drops low and skids, front legs braced forward, hind legs tucked under,
    leaning back with the hips swinging out a little; the game draws the rainbow trail."""
    low = {'lift': -drop * 0.75, 'Body': -0.2, 'Body:y': 0.2,
           'FrontLeg.L': -1.05, 'FrontLeg.R': -0.95, 'FrontShin.L': -0.1, 'FrontShin.R': 0.0,
           'BackLeg.L': -1.0, 'BackLeg.R': -1.05, 'BackShin.L': 1.7, 'BackShin.R': 1.75,
           'Neck': 1.2, 'Head': -0.55, 'Head:z': -0.15, 'Ear.L': -1.2, 'Ear.R': -1.2,
           'Mane': -0.3, 'Tail1': 0.9, 'Tail2': 0.4, **TUNE.get('skid', {})}
    pose = keyed([(0, {}), (3, low), (21, {**low, 'Body:y': -0.1})], f)
    wobble = smooth((f - 3) / 3)
    pose['Body:y'] = pose.get('Body:y', 0) + wobble * 0.08 * math.sin(TAU * f / 7)
    pose['Tail1:z'] = wobble * 0.35 * math.sin(TAU * f / 9)
    return pose


# ---------------------------------------------------------------- checks and previews


def heights(mesh, rig, action, frames):
    """Highest point of the deformed mesh on each frame of a clip."""
    rig.animation_data.action = action
    out = []
    for f in range(frames):
        bpy.context.scene.frame_set(f)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = mesh.evaluated_get(depsgraph)
        co = np.array([v.co[:] for v in evaluated.to_mesh().vertices])
        evaluated.to_mesh_clear()
        out.append((co[:, 2].max(), co[:, 2].min(), np.abs(co[:, 0]).max()))
    rig.animation_data.action = None
    return out


def solve_drop(mesh, rig, make, frames, check_frames):
    """Lower the body until the lowest point over the checked frames just touches the ground."""
    lo, hi = -0.5, 0.8
    for _ in range(9):
        drop = (lo + hi) / 2
        action = bake(rig, '_probe', frames, lambda f: make(f, drop), False)
        hs = heights(mesh, rig, action, frames)
        bpy.data.actions.remove(action)
        bottom = min(hs[f][1] for f in check_frames)
        top = max(hs[f][0] for f in check_frames)
        if bottom < 0.0:
            hi = drop
        else:
            lo = drop
    print(f'  drop {lo:.2f} m: top {top:.2f} m, lowest point {bottom:.3f} m')
    return lo


def previews(rig, clips, directory):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 12
    sc.cycles.use_denoising = False
    world = bpy.data.worlds.new('w')
    world.color = (0.85, 0.85, 0.9)
    sc.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 4
    sun.rotation_euler = (0.7, 0.3, 1.2)
    sc.collection.objects.link(sun)
    bpy.ops.mesh.primitive_plane_add(size=6)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.location = (3.4, -0.6, 0.7)
    cam.rotation_euler = (math.radians(86), 0, math.radians(80))
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = 260, 220
    for name, (action, frames, picks) in clips.items():
        rig.animation_data.action = action
        for i, f in enumerate(picks):
            sc.frame_set(f)
            sc.render.filepath = f'{directory}/{name}-{i}.png'
            bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None


# ---------------------------------------------------------------- main


def main():
    args = sys.argv[sys.argv.index('--') + 1:]
    source, target = args[0], args[1]
    preview_dir = args[args.index('--previews') + 1] if '--previews' in args else None
    character = args[args.index('--character') + 1]
    S = SKELETONS[character]
    TUNE.update(S.get('tune', {}))
    mesh = load(source)  # resets Blender to factory settings, so the frame rate is set after it
    bpy.context.scene.render.fps = FPS
    straighten(mesh)
    decimate(mesh, MAX_TRIANGLES)
    rig = build_armature(S)
    skin(mesh, rig)
    attach_points(rig, S)

    print('solving the slide and tumble heights')
    slide_drop = solve_drop(mesh, rig, slide, 21, range(4, 21))
    ball_drop = 0.0  # the roll is grounded frame by frame

    # Frames whose lowest point is put on the ground after posing.
    grounded = {'Hit': range(16), 'Out': range(46), 'Signature': range(1, 22)}
    if S['signature'] != 'tumble':
        ball_drop = 0.0
    clips = {
        'Idle': (60, idle, True),
        'Run': (16, run, True),
        'Jump': (18, jump, False),
        'Slide': (21, lambda f: slide(f, slide_drop), False),
        'Hit': (15, hit, False),
        'Out': (45, out, False),
        'Celebrate': (60, celebrate, True),
        'Signature': (21, (lambda f: tumble(f, ball_drop, slide_drop)) if S['signature'] == 'tumble'
                      else (lambda f: skid(f, slide_drop)), False),
    }
    baked = {}
    for name, (frames, fn, loop) in clips.items():
        action = bake(rig, name, frames, fn, loop, mesh, grounded.get(name, ()))
        hs = heights(mesh, rig, action, frames)
        print(f'{name:10s} {frames:3d} frames  top {max(h[0] for h in hs):.2f} m  '
              f'lowest {min(h[1] for h in hs):.2f} m  half-width {max(h[2] for h in hs):.2f} m')
        baked[name] = (action, frames)
        limit = {'Slide': SLIDE_MAX_HEIGHT, 'Signature': UNDER_BARRIER}.get(name)
        low_frames = hs[5:] if limit else []
        if limit and max(h[0] for h in low_frames) >= limit:
            print(f'  WARNING: {name} reaches {max(h[0] for h in low_frames):.2f} m, over {limit} m')
    for action in bpy.data.actions:
        if action.name.startswith('_probe'):
            bpy.data.actions.remove(action)

    if preview_dir:
        picks = {name: (a, n, [round(n * k / 4) for k in range(4)]) for name, (a, n) in baked.items()}
        previews(rig, picks, preview_dir)

    # Export only the character: the rig, its mesh and the attach empties (not the preview
    # floor, camera and light).
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj == rig or obj.parent == rig:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=target,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_frame_range=False,
        export_def_bones=False,
        export_skins=True,
        export_yup=True,
    )
    print(f'exported {target}')


main()
