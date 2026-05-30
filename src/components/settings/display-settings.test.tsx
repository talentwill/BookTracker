import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/test/test-utils"
import { DisplaySettings } from "./display-settings"

const mockSetTheme = vi.hoisted(() => vi.fn())
const mockMutate = vi.hoisted(() => vi.fn())

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: mockSetTheme, theme: "light" }),
}))

vi.mock("@/lib/hooks/use-profile", () => ({
  useProfile: () => ({
    data: {
      id: "user-1",
      theme: "light",
      books_per_page: 30,
    },
  }),
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

describe("DisplaySettings", () => {
  it("renders theme toggle buttons", () => {
    const { container } = render(<DisplaySettings />)
    const buttons = container.querySelectorAll("button")
    const buttonTexts = [...buttons].map(b => b.textContent)
    expect(buttonTexts).toContain("浅色")
    expect(buttonTexts).toContain("深色")
    expect(buttonTexts).toContain("跟随系统")
  })

  it("renders books per page input with profile value", () => {
    render(<DisplaySettings />)
    expect(screen.getByDisplayValue("30")).toBeInTheDocument()
  })

  it("renders books per page label", () => {
    render(<DisplaySettings />)
    expect(screen.getByText("每页显示数量")).toBeInTheDocument()
    expect(screen.getByText("范围 10-100")).toBeInTheDocument()
  })

  it("renders theme label", () => {
    render(<DisplaySettings />)
    expect(screen.getByText("主题")).toBeInTheDocument()
  })
})
