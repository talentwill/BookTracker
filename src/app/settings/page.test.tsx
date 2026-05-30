import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/test/test-utils"

const mockUseProfile = vi.hoisted(() => vi.fn())

vi.mock("@/lib/hooks/use-profile", () => ({
  useProfile: mockUseProfile,
  useUpdateProfile: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn(), theme: "light" }),
}))

const { default: SettingsPage } = await import("./page")

describe("SettingsPage", () => {
  it("shows loading state", () => {
    mockUseProfile.mockReturnValue({ data: undefined, isLoading: true })
    render(<SettingsPage />)
    expect(screen.getByText("加载中...")).toBeInTheDocument()
  })

  it("shows login prompt when not authenticated", () => {
    mockUseProfile.mockReturnValue({ data: null, isLoading: false })
    render(<SettingsPage />)
    expect(screen.getByText("请先登录")).toBeInTheDocument()
  })

  it("shows settings title when authenticated", () => {
    mockUseProfile.mockReturnValue({
      data: { id: "user-1", ai_provider: "claude", ai_api_key: "", ai_base_url: "", ai_model: "" },
      isLoading: false,
    })
    render(<SettingsPage />)
    expect(screen.getByText("设置")).toBeInTheDocument()
    expect(screen.getByText("管理你的账户和偏好设置")).toBeInTheDocument()
  })

  it("renders settings tabs when authenticated", () => {
    mockUseProfile.mockReturnValue({
      data: { id: "user-1", ai_provider: "claude", ai_api_key: "", ai_base_url: "", ai_model: "" },
      isLoading: false,
    })
    const { container } = render(<SettingsPage />)
    const tabButtons = container.querySelectorAll("nav button")
    const tabTexts = [...tabButtons].map(b => b.textContent)
    expect(tabTexts).toContain("AI 服务")
    expect(tabTexts).toContain("显示偏好")
    expect(tabTexts).toContain("账户")
    expect(tabTexts).toContain("数据管理")
  })
})
