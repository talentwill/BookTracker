interface StatCardProps {
  label: string
  value: number | string
  sub: string
  variant: "blue" | "green" | "gray"
}

const variants = {
  blue: "bg-[#f2f9ff] border-[rgba(0,117,222,0.1)]",
  green: "bg-[#e6f9ee] border-[rgba(26,174,57,0.15)]",
  gray: "bg-[#f6f5f4] border-[rgba(0,0,0,0.06)]",
}

const textColors = {
  blue: "text-[#0075de]",
  green: "text-[#1aae39]",
  gray: "text-[rgba(0,0,0,0.95)]",
}

const labelColors = {
  blue: "text-[#097fe8]",
  green: "text-[#1aae39]",
  gray: "text-[#615d59]",
}

export function StatCard({ label, value, sub, variant }: StatCardProps) {
  return (
    <div className={`flex-1 rounded-[10px] border px-5 py-4 ${variants[variant]}`}>
      <div className={`mb-1.5 text-xs font-semibold ${labelColors[variant]}`}>{label}</div>
      <div className={`text-[28px] font-bold ${textColors[variant]}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-[#615d59]">{sub}</div>
    </div>
  )
}
