/**
 * Hero 3D 的全部可调参数。
 *
 * 集中在此，便于调参时不翻实现代码。
 */

/** 摆动周期目标（秒）。短绳配宽矮空间，1.25s 是"优雅但不拖沓"的取值（spec §7.3）。 */
export const PERIOD_S = 1.25;

/** 阻尼比 ζ。0.15 → 每周期振幅衰减至 28%，约 2~3 摆收敛（spec §7.3）。 */
export const ZETA = 0.15;

/** 固定物理步长。必须固定，否则 120Hz 屏上摆动速度翻倍（spec §7.3）。 */
export const FIXED_DT = 1 / 120;

/** 每帧最大迭代次数，防止标签页切回时 accumulator 爆炸。 */
export const MAX_SUBSTEPS = 8;

/** 锚点位于视口上方之外的距离（世界单位）。绳子"出画"垂入（spec §7.2）。 */
export const ANCHOR_ABOVE_VIEW = 6;

/** 相机仰视角（弧度）。约 2.9°，再多会看到徽章底面（spec §7.2）。 */
export const CAMERA_PITCH = 0.05;

export const CAMERA_FOV = 38;

/** 绳索段数。多段才有"绳"的滞后感，单段只是直线（spec §7）。 */
export const ROPE_SEGMENTS = 10;

/** 绳索渲染宽度（像素）。THREE.Line 的 linewidth 多数平台被忽略，必须用 Line2。 */
export const ROPE_WIDTH_PX = 1.8;

/** 徽章归一化后的目标直径（世界单位）。各徽章坐标系不同，统一缩放到此尺寸。 */
export const BADGE_SIZE = 14;

/** 徽章朝向软回正强度（每秒）。太大则不自旋失去"叮当乱晃"，太小则 logo 不可读。 */
export const ORIENT_RESTITUTION = 2.4;

/** 角阻尼（每秒速度衰减系数）。 */
export const ANGULAR_DAMPING = 0.35;

/** 碰撞弹性系数。 */
export const RESTITUTION = 0.35;

/** 徽章转动惯量（标量近似）。越小越容易被撞转。 */
export const BADGE_INERTIA = 0.6;

/** idle 风：连续低频噪声幅度 + 阵风幅度（世界单位/秒²）。 */
export const IDLE_NOISE_AMP = 0.35;
export const IDLE_GUST_AMP = 1.6;
/** 阵风间隔随机区间（秒）。各徽章相位错开，避免同步摆动显得机械（spec §7.3）。 */
export const IDLE_GUST_INTERVAL_S = [4, 9] as const;

/** 速度上限（世界单位/秒）。防止能量注入把徽章甩飞。 */
export const MAX_SPEED = 26;

/** 拨动：作用半径与冲量上限。 */
export const SWIPE_RADIUS = 7;
export const SWIPE_IMPULSE_MAX = 9;

/** 抓取：弹簧刚度与阻尼（临界阻尼附近），以及力上限。 */
export const GRAB_STIFFNESS = 90;
export const GRAB_DAMPING = 19;
export const GRAB_FORCE_MAX = 220;

/** hover：倾斜限幅（弧度，0.22 ≈ 12.6°）与视觉放大。 */
export const HOVER_TILT_MAX = 0.22;
export const HOVER_SCALE = 1.06;

/** 移动端降级阈值（px）。 */
export const MOBILE_BREAKPOINT = 768;
