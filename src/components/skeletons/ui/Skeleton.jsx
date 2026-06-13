// components/ui/Skeleton.jsx

export default function Skeleton({
  className = "",
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
}