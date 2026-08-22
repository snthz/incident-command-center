import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editIncidentText } from "@/features/incidents/actions";
import { InlineEditable } from "@/features/incidents/inline-edit";

const push = vi.fn();

vi.mock("@/components/ui/toaster", () => ({
  useToast: () => ({ push }),
}));

vi.mock("@/features/incidents/actions", () => ({
  editIncidentText: vi.fn(),
}));

const editMock = vi.mocked(editIncidentText);

const props = {
  incidentId: "0b9d54a2-4f6a-4d10-9c3a-2e8f13bb61aa",
  incidentKey: "CORE-7",
  field: "title" as const,
  value: "Checkout latency above SLO",
};

describe("InlineEditable", () => {
  beforeEach(() => {
    push.mockReset();
    editMock.mockReset();
  });

  it("shows the value and enters edit mode on click", async () => {
    const user = userEvent.setup();
    render(<InlineEditable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    expect(screen.getByRole("textbox", { name: "Edit title" })).toHaveValue(props.value);
  });

  it("rejects an invalid draft client-side without calling the server", async () => {
    const user = userEvent.setup();
    render(<InlineEditable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    const input = screen.getByRole("textbox", { name: "Edit title" });
    await user.clear(input);
    await user.type(input, "short");
    await user.click(screen.getByRole("button", { name: "Save title" }));
    expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
    expect(editMock).not.toHaveBeenCalled();
    expect(input).toBeInTheDocument();
  });

  it("shows the optimistic value while saving and confirms with a toast", async () => {
    let finishSave: (result: { error?: string }) => void = () => {};
    editMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<InlineEditable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    const input = screen.getByRole("textbox", { name: "Edit title" });
    await user.clear(input);
    await user.type(input, "Payments API fully degraded{Enter}");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Edit title" }),
      ).toHaveTextContent("Payments API fully degraded");
    });
    expect(editMock).toHaveBeenCalledWith({
      id: props.incidentId,
      title: "Payments API fully degraded",
    });
    finishSave({});
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("success", "CORE-7 updated");
    });
  });

  it("reverts the optimistic value when the server rejects the edit", async () => {
    editMock.mockResolvedValue({ error: "You cannot edit this incident." });
    const user = userEvent.setup();
    render(<InlineEditable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    const input = screen.getByRole("textbox", { name: "Edit title" });
    await user.clear(input);
    await user.type(input, "Payments API fully degraded{Enter}");
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("error", "You cannot edit this incident.");
      expect(
        screen.getByRole("button", { name: "Edit title" }),
      ).toHaveTextContent(props.value);
    });
  });

  it("cancels with Escape and keeps the original value", async () => {
    const user = userEvent.setup();
    render(<InlineEditable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Edit title" }),
    ).toHaveTextContent(props.value);
    expect(editMock).not.toHaveBeenCalled();
  });
});
