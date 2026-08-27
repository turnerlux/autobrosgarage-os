import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AiCommandPage from "./page";

describe("AiCommandPage", () => {
  it("shows the AI command center layout and a clear preview-only notice", () => {
    render(<AiCommandPage />);

    expect(
      screen.getByRole("heading", { name: "Ask once. Auto Bros AI does the rest." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preview only — nothing is saved")).toBeInTheDocument();
    expect(screen.getAllByText("Preview — not saved")[0]).toBeInTheDocument();
  });

  it("keeps camera and voice input disabled, and disables Ask until there is a draft", () => {
    render(<AiCommandPage />);

    expect(screen.getByRole("button", { name: "Attach a photo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record a voice note" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
  });

  it("shows no conversation until an example or a question is submitted", () => {
    render(<AiCommandPage />);

    expect(screen.queryByRole("list", { name: "Conversation history" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Nothing here yet — try an example or ask your own question."),
    ).toBeInTheDocument();
  });

  it("previews the matching tool when an example command is run", () => {
    render(<AiCommandPage />);

    fireEvent.click(screen.getByRole("button", { name: /Find customer Jordan Ellis/ }));

    const conversation = within(screen.getByRole("list", { name: "Conversation history" }));
    expect(conversation.getByText("Find customer Jordan Ellis")).toBeInTheDocument();
    expect(conversation.getByText(/I'd call `find_customer`/)).toBeInTheDocument();
    expect(
      conversation.getByText(/No AI provider is connected yet, so this is a preview/),
    ).toBeInTheDocument();
  });

  it("lets the user ask a free-form question and returns the not-connected explanation", () => {
    render(<AiCommandPage />);

    fireEvent.change(screen.getByLabelText("What needs doing?"), {
      target: { value: "What's the status of job AB-2026-000001?" },
    });
    expect(screen.getByRole("button", { name: "Ask" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(screen.getByText("What's the status of job AB-2026-000001?")).toBeInTheDocument();
    expect(screen.getByText(/isn't connected to a model provider yet/)).toBeInTheDocument();
    expect(screen.getByLabelText("What needs doing?")).toHaveValue("");
  });

  it("clears the conversation", () => {
    render(<AiCommandPage />);

    fireEvent.click(screen.getByRole("button", { name: /Find customer Jordan Ellis/ }));
    expect(screen.getByRole("button", { name: "Clear conversation" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear conversation" }));

    expect(screen.queryByRole("list", { name: "Conversation history" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear conversation" })).not.toBeInTheDocument();
  });

  it("lists every currently-registered AI tool with its required permission", () => {
    render(<AiCommandPage />);

    const toolGrid = within(screen.getByRole("list", { name: "Available AI tools" }));
    for (const name of [
      "find_customer",
      "find_vehicle",
      "get_service_history",
      "create_customer",
      "create_vehicle",
      "create_job",
      "update_job",
      "save_diagnostic_finding",
    ]) {
      expect(toolGrid.getByText(name)).toBeInTheDocument();
    }
    expect(toolGrid.getAllByText("Requires jobs:write").length).toBeGreaterThanOrEqual(2);
  });
});
