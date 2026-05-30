import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/test/test-utils"
import userEvent from "@testing-library/user-event"
import { AiSettings } from "./ai-settings"

const mockMutate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/hooks/use-profile", () => ({
  useProfile: () => ({
    data: {
      id: "user-1",
      ai_provider: "claude",
      ai_api_key: "sk-ant-test",
      ai_base_url: "",
      ai_model: "claude-sonnet-4-20250514",
    },
  }),
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

describe("AiSettings", () => {
  it("renders provider buttons", () => {
    const { container } = render(<AiSettings />)
    const buttons = container.querySelectorAll("button")
    const buttonTexts = [...buttons].map(b => b.textContent)
    expect(buttonTexts).toContain("Claude")
    expect(buttonTexts).toContain("OpenAI")
  })

  it("renders API config labels", () => {
    const { container } = render(<AiSettings />)
    const labels = container.querySelectorAll("label")
    const labelTexts = [...labels].map(l => l.textContent)
    expect(labelTexts).toContain("API Key")
    expect(labelTexts).toContain("Base URL")
    expect(labelTexts).toContain("模型")
  })

  it("renders save button", () => {
    render(<AiSettings />)
    expect(screen.getByRole("button", { name: "保存设置" })).toBeInTheDocument()
  })

  it("renders current provider label", () => {
    render(<AiSettings />)
    expect(screen.getByText("Anthropic")).toBeInTheDocument()
  })

  it("calls mutate on save click", async () => {
    const user = userEvent.setup()
    render(<AiSettings />)
    await user.click(screen.getByRole("button", { name: "保存设置" }))
    expect(mockMutate).toHaveBeenCalled()
  })
})
