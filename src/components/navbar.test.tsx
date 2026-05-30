import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/test/test-utils"
import userEvent from "@testing-library/user-event"

const mockUseAuth = vi.hoisted(() => vi.fn<(args?: unknown) => { user: { email?: string } | null }>())

mockUseAuth.mockReturnValue({ user: null })
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/"))

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/components/auth-provider", () => ({
  useAuth: mockUseAuth,
}))

const { Navbar } = await import("./navbar")

describe("Navbar unauthenticated", () => {
  it("shows login button when not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(<Navbar />)
    expect(screen.getByRole("link", { name: "登录" })).toBeInTheDocument()
  })

  it("renders navigation tabs", () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { container } = render(<Navbar />)
    const links = container.querySelectorAll("nav a")
    const tabTexts = [...links].map(a => a.textContent).filter(Boolean)
    expect(tabTexts).toContain("首页")
    expect(tabTexts).toContain("书架")
    expect(tabTexts).toContain("作者")
    expect(tabTexts).toContain("时间线")
  })
})

describe("Navbar authenticated", () => {
  it("shows avatar button with email initial", () => {
    mockUseAuth.mockReturnValue({ user: { email: "test@example.com" } })
    render(<Navbar />)
    const btn = screen.getByTitle("用户菜单")
    expect(btn).toHaveTextContent("T")
  })

  it("shows avatar fallback U when email is undefined", () => {
    mockUseAuth.mockReturnValue({ user: { email: undefined } })
    render(<Navbar />)
    const btn = screen.getByTitle("用户菜单")
    expect(btn).toHaveTextContent("U")
  })

  it("opens dropdown on avatar click", async () => {
    mockUseAuth.mockReturnValue({ user: { email: "test@example.com" } })
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByTitle("用户菜单"))
    expect(screen.getByText("设置")).toBeInTheDocument()
    expect(screen.getByText("退出登录")).toBeInTheDocument()
  })
})
