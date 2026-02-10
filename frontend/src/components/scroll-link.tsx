"use client";

export function ScrollLink({
  targetId,
  className,
  style,
  children,
}: {
  targetId: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
