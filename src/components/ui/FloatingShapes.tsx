/**
 * MindMosaic — FloatingShapes Background
 *
 * Subtle decorative background with soft geometric shapes.
 * Purely visual — no interactivity, no logic.
 *
 * Usage:
 *   <FloatingShapes />                  → default pastel circles
 *   <FloatingShapes variant="warm" />   → warm-toned shapes
 *
 * Place as the first child of a relative-positioned container:
 *   <div className="relative overflow-hidden">
 *     <FloatingShapes />
 *     <div className="relative z-10">...content...</div>
 *   </div>
 *
 * Uses CSS-only positioning — no JS, no animations.
 * Respects prefers-reduced-motion by being static.
 */

type ShapeVariant = "cool" | "warm";

interface FloatingShapesProps {
  variant?: ShapeVariant;
  className?: string;
}

const SHAPES: Record<ShapeVariant, Array<{ className: string }>> = {
  cool: [
    { className: "top-[10%] left-[5%] h-32 w-32 rounded-full bg-blue-100/40" },
    {
      className: "top-[60%] right-[8%] h-24 w-24 rounded-full bg-indigo-100/30",
    },
    {
      className: "top-[30%] right-[20%] h-16 w-16 rounded-full bg-cyan-100/40",
    },
    {
      className:
        "bottom-[15%] left-[15%] h-20 w-20 rounded-full bg-purple-100/20",
    },
    { className: "top-[5%] right-[40%] h-12 w-12 rounded-full bg-blue-200/25" },
  ],
  warm: [
    { className: "top-[10%] left-[5%] h-32 w-32 rounded-full bg-amber-100/40" },
    { className: "top-[60%] right-[8%] h-24 w-24 rounded-full bg-rose-100/30" },
    {
      className:
        "top-[30%] right-[20%] h-16 w-16 rounded-full bg-orange-100/40",
    },
    {
      className:
        "bottom-[15%] left-[15%] h-20 w-20 rounded-full bg-yellow-100/20",
    },
    { className: "top-[5%] right-[40%] h-12 w-12 rounded-full bg-rose-200/25" },
  ],
};

export function FloatingShapes({
  variant = "cool",
  className = "",
}: FloatingShapesProps) {
  const shapes = SHAPES[variant];

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {shapes.map((shape, index) => (
        <div key={index} className={`absolute blur-xl ${shape.className}`} />
      ))}
    </div>
  );
}
