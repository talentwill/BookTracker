interface StatCardProps {
  label: string
  value: number | string
  sub: string
  variant: "blue" | "green" | "gray"
}

const variants = {
  blue: "bg-[#f2f9ff] border-[rgba(0,117,222,0.1)] dark:bg-[#097fe8]/10 dark:border-[#097fe8]/20",
  green: "bg-[#e6f9ee] border-[rgba(26,174,57,0.15)] dark:bg-[#1aae39]/10 dark:border-[#1aae39]/20",
  gray: "bg-muted border-border",
}

const textColors = {
  blue: "text-[#0075de]",
  green: "text-[#1aae39]",
  gray: "text-foreground",
}

const labelColors = {
  blue: "text-[#097fe8]",
  green: "text-[#1aae39]",
  gray: "text-muted-foreground",
}

export function StatCard({ label, value, sub, variant }: StatCardProps) {
  return (
    <div className={`flex-1 rounded-[10px] border px-5 py-4 ${variants[variant]}`}>
      <div className={`mb-1.5 text-xs font-semibold ${labelColors[variant]}`}>{label}</div>
      <div className={`text-[28px] font-bold ${textColors[variant]}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}
