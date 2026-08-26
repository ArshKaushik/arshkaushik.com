export default function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-start gap-2 p-6 ${className}`}>
      <p className="text-[12px] text-textSecondaryPage">{label}</p>
      <p className="text-[16px] text-textPrimary">{value}</p>
    </div>
  );
}
