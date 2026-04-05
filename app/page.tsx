"use client";
import { useState, type ReactNode } from "react";

type FrameworkId = "python" | "ts" | "langchain" | "crewai" | "openai";
type CalloutType = "info" | "tip" | "warning";

const NAV_SECTIONS = [
  { group: "Getting Started", items: [
    { id: "overview",      label: "Overview" },
    { id: "installation",  label: "Installation" },
    { id: "quickstart",    label: "Quick Start" },
  ]},
  { group: "Core Concepts", items: [
    { id: "policy-yaml",   label: "Polaicy YAML" },
    { id: "actions",       label: "Actions" },
    { id: "pii-masking",   label: "PII Masking" },
  ]},
  { group: "Frameworks", items: [
    { id: "python",        label: "Python" },
    { id: "typescript",    label: "TypeScript / Node" },
    { id: "langchain",     label: "LangChain" },
    { id: "crewai",        label: "CrewAI" },
    { id: "openai-agents", label: "OpenAI Agents SDK" },
  ]},
  { group: "Reference", items: [
    { id: "audit-logs",    label: "Audit Logs" },
    { id: "jwt-identity",  label: "JWT Identity" },
  ]},
];

const FRAMEWORKS: Array<{ id: FrameworkId; label: string; icon: string; lang: string; file: string; soon?: boolean }> = [
  { id: "python",    label: "Python",            icon: "🐍", lang: "python", file: "agent.py" },
  { id: "ts",        label: "TypeScript",         icon: "TS", lang: "typescript", file: "agent.ts", soon: true },
  { id: "langchain", label: "LangChain",          icon: "🔗", lang: "python", file: "agent.py" },
  { id: "crewai",    label: "CrewAI",             icon: "🤖", lang: "python", file: "crew.py" },
  { id: "openai",    label: "OpenAI Agents SDK",  icon: "✦", lang: "python", file: "agent.py" },
];

const INSTALLS: Record<FrameworkId, string> = {
  python:    "pip install megent",
  ts:        "TypeScript SDK is coming soon",
  langchain: "pip install megent langchain langchain-openai",
  crewai:    "pip install megent crewai",
  openai:    "pip install megent openai openai-agents",
};

const DEMOS: Record<FrameworkId, string> = {
  python: `import megent

mgnt = megent.init(policy="policy.yaml")

@mgnt.guard
def get_user(user_id: str):
    return {
        "id": user_id,
        "email": "alice@acme.com",
        "phone": "555-0192",
        "ssn": "123-45-6789",
    }

@mgnt.guard
def delete_user(user_id: str):
    # ✗ blocked by policy — matches delete_*
    return {"deleted": user_id}

@mgnt.guard
def transfer_funds(amount: float, to: str):
    # ✗ blocked by policy — restrict-payments rule
    return {"transferred": amount, "to": to}

if __name__ == "__main__":
    # ✓ Allowed — PII masked in return value
    print(get_user("u_001"))
    # → {"id": "u_001", "email": "***", "phone": "***", "ssn": "***"}

    # ✗ Denied — rule: block-delete
    delete_user("u_001")
    # → MegentDenyError: 'block-delete' denied call: delete_user

    # ✗ Denied — rule: restrict-payments
    transfer_funds(500.00, "bob")
    # → MegentDenyError: Payment actions require human approval`,

  ts: `// TypeScript SDK support is coming soon.
// Follow releases for @megent/sdk availability.

// Planned install command:
// npm install @megent/sdk

// Planned usage:
// import { Megent } from "@megent/sdk";
// const mgnt = new Megent({ policy: "./policy.yaml" });`,

  langchain: `from langchain.tools import tool
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain import hub
import megent

mgnt = megent.init(policy="policy.yaml")

# Option 1: Guard individual LangChain tools
@mgnt.guard
@tool
def get_customer_data(customer_id: str) -> dict:
    """Fetch customer data from the CRM."""
    return {
        "id": customer_id,
        "email": "customer@example.com",
        "ssn": "123-45-6789",
    }

@mgnt.guard
@tool
def delete_customer(customer_id: str) -> dict:
    """Delete a customer record."""
    # ✗ blocked by policy
    return {"deleted": customer_id}

# Option 2: wrap() an entire toolkit
from langchain_community.agent_toolkits import SQLDatabaseToolkit
safe_toolkit = mgnt.wrap(SQLDatabaseToolkit(db=db, llm=llm))

llm = ChatOpenAI(model="gpt-4o")
prompt = hub.pull("hwchase17/openai-functions-agent")

agent = create_openai_functions_agent(
    llm=llm,
    tools=[get_customer_data, delete_customer],
    prompt=prompt,
)
executor = AgentExecutor(agent=agent, tools=[get_customer_data, delete_customer])

# Policy enforced on every tool call the LLM makes
result = executor.invoke({"input": "Get data for customer c_42"})
print(result["output"])
# delete_customer will be denied if the LLM tries to call it`,

  crewai: `from crewai import Agent, Task, Crew
from crewai.tools import BaseTool
import megent

mgnt = megent.init(policy="policy.yaml")

class CustomerLookupTool(BaseTool):
    name: str = "get_customer"
    description: str = "Look up a customer record by ID."

    def _run(self, customer_id: str) -> dict:
        return {
            "id": customer_id,
            "email": "user@example.com",
            "phone": "555-1234",
        }

class DeleteTool(BaseTool):
    name: str = "delete_record"
    description: str = "Delete a customer record permanently."

    def _run(self, record_id: str) -> dict:
        # ✗ will be intercepted and denied
        return {"deleted": record_id}

class PaymentTool(BaseTool):
    name: str = "transfer_funds"
    description: str = "Transfer funds between accounts."

    def _run(self, from_id: str, to_id: str, amount: float) -> dict:
        # ✗ will be intercepted and denied
        return {"status": "ok", "amount": amount}

# Wrap tools with Megent policy before passing to agents
safe_lookup  = mgnt.wrap(CustomerLookupTool())
safe_delete  = mgnt.wrap(DeleteTool())
safe_payment = mgnt.wrap(PaymentTool())

analyst = Agent(
    role="Data Analyst",
    goal="Analyze customer data with strict access controls",
    tools=[safe_lookup, safe_delete, safe_payment],
    backstory="You analyze data carefully and follow compliance rules.",
)

task = Task(
    description="Look up customer c_42 and summarize their profile.",
    agent=analyst,
    expected_output="A compliance-safe customer profile summary.",
)

crew = Crew(agents=[analyst], tasks=[task], verbose=True)
result = crew.kickoff()
# delete_record and transfer_funds will be denied automatically`,

  openai: `from openai_agents import Agent, Runner, function_tool
import megent

mgnt = megent.init(policy="policy.yaml")

@mgnt.guard
@function_tool
def get_user_profile(user_id: str) -> dict:
    """Retrieve a user profile from the database."""
    return {
        "id": user_id,
        "name": "Alice Smith",
        "email": "alice@acme.com",
        "phone": "555-0192",
        "ssn": "123-45-6789",
    }

@mgnt.guard
@function_tool
def delete_user_account(user_id: str) -> dict:
    """Permanently delete a user account and all data."""
    # ✗ blocked — rule: block-delete
    return {"deleted": user_id}

@mgnt.guard
@function_tool
def transfer_funds(from_id: str, to_id: str, amount: float) -> dict:
    """Transfer funds between two accounts."""
    # ✗ blocked — rule: restrict-payments
    return {"status": "ok", "amount": amount}

agent = Agent(
    name="Support Agent",
    instructions=(
        "You are a customer support agent. Help users with account "
        "management. You must follow all compliance policies."
    ),
    tools=[get_user_profile, delete_user_account, transfer_funds],
)

# Megent enforces policy on every tool call the agent makes:
# get_user_profile  → ✓ allowed, PII masked in output
# delete_user_account → ✗ denied by 'block-delete'
# transfer_funds    → ✗ denied by 'restrict-payments'
result = Runner.run_sync(agent, "Get the profile for user u_001")
print(result.final_output)`,
};

const YAML_POLICY = `version: "1.0"
agent: production-agent

rules:
  - id: block-delete
    description: No agent may delete any resource
    match:
      tool: "delete_*"
    action: deny

  - id: restrict-payments
    description: Payment tools require human-in-the-loop
    match:
      tool: "transfer_*"
    action: deny
    reason: "Payment actions require human approval"

  - id: mask-pii
    description: Strip PII from all tool outputs
    match:
      tool: "*"
    action: mask
    fields:
      - email
      - phone
      - ssn
      - credit_card
      - ip_address

  - id: allow-reads
    description: Read operations are permitted
    match:
      tool: "get_*"
    action: allow`;

async function copyText(value: string) {
  if (!value.trim()) return;
  await navigator.clipboard.writeText(value);
}

// Lightweight syntax highlighter
function hl(code: string, lang: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let s = esc(code);
  if (lang === "yaml") {
    s = s
      .replace(/"([^"\n]*)"/g,'<i class="sv">"$1"</i>')
      .replace(/(#.*$)/gm, '<i class="c">$1</i>')
      .replace(/^(\s*)([\w-]+)(:)/gm,'$1<b class="k">$2</b>$3')
      .replace(/\b(deny|allow|mask)\b/g,'<b class="act">$1</b>');
  } else if (lang === "bash") {
    s = `<i class="sv">${s}</i>`;
  } else {
    s = s
      .replace(/("""[\s\S]*?"""|"[^"\n]*"|'[^'\n]*')/g,'<i class="sv">$1</i>')
      .replace(/(#.*$)/gm,'<i class="c">$1</i>')
      .replace(/\b(import|from|async|await|const|let|new|return|if|else|try|catch|def|for|in|with|as|print)\b/g,'<b class="kw">$1</b>')
      .replace(/@([\w.]+)/g,'<b class="dc">@$1</b>')
      .replace(/\b(True|False|None|true|false|null|undefined)\b/g,'<b class="lt">$1</b>')
      .replace(/\b(\d+\.?\d*)\b/g,'<b class="nm">$1</b>')
      .replace(/# [✓✗].*$/gm, (m: string) => (m.includes("✓") ? `<i class="ok">${m}</i>` : `<i class="no">${m}</i>`))
      .replace(/\/\/ [✓✗].*$/gm, (m: string) => (m.includes("✓") ? `<i class="ok">${m}</i>` : `<i class="no">${m}</i>`));
  }
  return s;
}

type CodeBlockProps = {
  code: string;
  lang?: string;
  filename?: string;
};

function CodeBlock({ code, lang = "python", filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #dbe6f5", marginBottom: 20, boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#f6f9ff", borderBottom: "1px solid #dbe6f5" }}>
        <span style={{ fontSize: 11.5, color: "#64748b", fontFamily: "JetBrains Mono,monospace" }}>{filename || lang}</span>
        <button
          onClick={handleCopy}
          style={{
            fontSize: 11,
            color: copied ? "#059669" : "#475569",
            border: "1px solid #d2dff0",
            background: copied ? "#ecfdf5" : "#ffffff",
            borderRadius: 999,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "4px 10px",
            fontWeight: 600,
          }}
        >
          {copied ? "✓ copied" : "Copy"}
        </button>
      </div>
      <div style={{ background: "#ffffff", padding: "22px 24px", overflowX: "auto" }}>
        <style>{`
          .c{color:#94a3b8;font-style:normal} .k{color:#4338ca;font-weight:700;font-style:normal}
          .kw{color:#4f46e5;font-weight:700;font-style:normal} .sv{color:#047857;font-style:normal}
          .act{color:#dc2626;font-weight:700;font-style:normal} .lt{color:#b91c1c;font-style:normal}
          .nm{color:#c2410c;font-style:normal} .dc{color:#7c3aed;font-style:normal}
          .ok{color:#059669;font-style:normal} .no{color:#dc2626;font-style:normal}
        `}</style>
        <pre style={{ margin: 0, fontSize: 12.5, lineHeight: 1.85, color: "#334155", fontFamily: "JetBrains Mono,Fira Code,monospace", whiteSpace: "pre" }}>
          <code dangerouslySetInnerHTML={{ __html: hl(code, lang) }} />
        </pre>
      </div>
    </div>
  );
}

function FrameworkDemos() {
  const [active, setActive] = useState<FrameworkId>("python");
  const fw = FRAMEWORKS.find((f) => f.id === active) ?? FRAMEWORKS[0];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {FRAMEWORKS.map(f => {
          const on = active === f.id;
          return (
            <button key={f.id} onClick={() => { if (!f.soon) setActive(f.id); }} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 15px", borderRadius: 8, fontSize: 13, fontWeight: on ? 600 : 400,
              border: `1px solid ${on ? "#4f46e5" : "#d8e3f2"}`,
              background: on ? "#eef2ff" : "#ffffff",
              color: f.soon ? "#94a3b8" : on ? "#4338ca" : "#475569",
              cursor: f.soon ? "not-allowed" : "pointer", transition: "all 0.12s", fontFamily: "inherit",
              opacity: f.soon ? 0.8 : 1,
            }}>
              <span style={{ fontSize: 12, letterSpacing: f.id === "ts" ? "-0.05em" : 0, fontWeight: 800 }}>{f.icon}</span>
              {f.label}
              {f.soon && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c3aed", border: "1px solid #ddd6fe", background: "#f5f3ff", borderRadius: 999, padding: "1px 6px" }}>
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Install</span>
      </div>
      <CodeBlock code={INSTALLS[active]} lang="bash" filename="terminal" />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Full example</span>
      </div>
      <CodeBlock code={DEMOS[active]} lang={fw.lang} filename={fw.file} />
    </div>
  );
}

type SectionProps = {
  id: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  children: ReactNode;
};

function Section({ id, title, badge, badgeColor = "#6366f1", children }: SectionProps) {
  return (
    <section id={id} style={{ marginBottom: 72, scrollMarginTop: 72 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "Bricolage Grotesque,sans-serif", color: "#0f172a", letterSpacing: "-0.025em" }}>{title}</h2>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 9px", borderRadius: 999, background: badgeColor + "16", color: badgeColor, border: `1px solid ${badgeColor}2f` }}>{badge}</span>}
      </div>
      <div style={{ width: 28, height: 2, background: "#4f46e5", borderRadius: 2, marginBottom: 28 }} />
      {children}
    </section>
  );
}

type CalloutProps = {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
};

function Callout({ type = "info", title, children }: CalloutProps) {
  const m: Record<CalloutType, { bg: string; border: string; icon: string; color: string }> = {
    info:    { bg: "#eff6ff", border: "#93c5fd", icon: "ℹ", color: "#2563eb" },
    tip:     { bg: "#ecfdf5", border: "#86efac", icon: "✦", color: "#16a34a" },
    warning: { bg: "#fffbeb", border: "#fcd34d", icon: "⚠", color: "#d97706" },
  };
  const s = m[type];
  return (
    <div style={{ padding: "14px 18px", borderRadius: 8, marginBottom: 20, background: s.bg, borderLeft: `3px solid ${s.color}`, border: `1px solid ${s.border}`, borderLeftColor: s.color, display: "flex", gap: 12 }}>
      <span style={{ color: s.color, fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div>
        {title && <p style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 700, color: s.color }}>{title}</p>}
        <p style={{ margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.65 }}>{children}</p>
      </div>
    </div>
  );
}

type PropRowProps = {
  name: string;
  type: string;
  req?: boolean;
  desc: string;
};

function PropRow({ name, type, req, desc }: PropRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 90px 1fr", gap: 16, padding: "13px 20px", borderBottom: "1px solid #e2ebf7", alignItems: "start" }}>
      <code style={{ color: "#4338ca", fontSize: 12, fontFamily: "JetBrains Mono,monospace" }}>{name}{req && <span style={{ color: "#dc2626" }}> *</span>}</code>
      <code style={{ color: "#047857", fontSize: 11.5, fontFamily: "JetBrains Mono,monospace" }}>{type}</code>
      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.6 }}>{desc}</span>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("overview");
  const [pageCopied, setPageCopied] = useState(false);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const copyPageForLlm = async () => {
    const content = document.getElementById("docs-main-content");
    const text = content?.innerText?.replace(/\n{3,}/g, "\n\n")?.trim() ?? "";
    if (!text) return;
    await copyText(text);
    setPageCopied(true);
    setTimeout(() => setPageCopied(false), 2000);
  };

  return (
    <div style={{ background: "linear-gradient(180deg,#f8fbff 0%,#f1f6ff 100%)", minHeight: "100vh", color: "#0f172a", fontFamily: "DM Sans,system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#eef4ff}
        ::-webkit-scrollbar-thumb{background:#cbd9ee;border-radius:999px}
        button,a{font-family:inherit}
      `}</style>

      {/* TOP NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 200, height: 58, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(248,251,255,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid #d7e2f2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px #6366f140" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "Bricolage Grotesque,sans-serif" }}>M</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-0.03em", fontFamily: "Bricolage Grotesque,sans-serif", color: "#0b1220" }}>megent</span>
          <span style={{ color: "#94a3b8", fontSize: 15, margin: "0 2px" }}>/</span>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>docs</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { label: "GitHub", soon: false },
            { label: "PyPI", soon: false },
            { label: "npm", soon: true },
          ].map((item) => (
            <button
              key={item.label}
              style={{
                padding: "6px 13px",
                fontSize: 12.5,
                color: item.soon ? "#94a3b8" : "#475569",
                background: "none",
                border: "none",
                cursor: item.soon ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              disabled={item.soon}
            >
              {item.label}
              {item.soon && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#7c3aed",
                    border: "1px solid #ddd6fe",
                    background: "#f5f3ff",
                    borderRadius: 999,
                    padding: "1px 6px",
                  }}
                >
                  Soon
                </span>
              )}
            </button>
          ))}
          <button style={{ padding: "7px 18px", borderRadius: 7, background: "#4f46e5", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px #4f46e535" }}>Get Started →</button>
        </div>
      </header>

      <div style={{ display: "flex", maxWidth: 1240, margin: "0 auto" }}>

        {/* SIDEBAR */}
        <aside style={{ width: 228, flexShrink: 0, position: "sticky", top: 58, height: "calc(100vh - 58px)", overflowY: "auto", padding: "28px 0", borderRight: "1px solid #d7e2f2" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.group} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", padding: "0 20px", marginBottom: 6 }}>{sec.group}</p>
              {sec.items.map(item => {
                const on = active === item.id;
                return (
                  <button key={item.id} onClick={() => go(item.id)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 20px 8px 17px", fontSize: 13, fontWeight: on ? 600 : 400,
                    color: on ? "#4338ca" : "#475569",
                    background: on ? "#e9edff" : "transparent",
                    border: "none", borderLeft: `2px solid ${on ? "#6366f1" : "transparent"}`,
                    cursor: "pointer", transition: "all 0.12s",
                  }}>{item.label}</button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main id="docs-main-content" style={{ flex: 1, padding: "52px 60px 120px", maxWidth: 860, minWidth: 0 }}>

          {/* HERO */}
          <div style={{ marginBottom: 72 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap" }}>
                {[["v0.1.0","#6366f1"],["Python","#34d399"],["TypeScript","#60a5fa"],["MIT License","#f472b6"]].map(([l,c]) => (
                  <span key={l} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", padding: "2px 10px", borderRadius: 999, background: c+"18", color: c, border: `1px solid ${c}28`, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {l}
                    {l === "TypeScript" && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c3aed", border: "1px solid #ddd6fe", background: "#f5f3ff", borderRadius: 999, padding: "1px 6px" }}>
                        Soon
                      </span>
                    )}
                  </span>
              ))}
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, fontFamily: "Bricolage Grotesque,sans-serif", letterSpacing: "-0.03em", color: "#0b1220", margin: 0 }}>
                  Megent SDK<br /><span style={{ color: "#4f46e5" }}>Documentation</span>
                </h1>
                <button
                  onClick={copyPageForLlm}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: pageCopied ? "#ecfdf5" : "#ffffff",
                    color: pageCopied ? "#059669" : "#334155",
                    border: "1px solid #d5e2f2",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
                  }}
                >
                  <span aria-hidden="true">⧉</span>
                  {pageCopied ? "Copied" : "Copy Docs"}
                </button>
              </div>
            <p style={{ fontSize: 15.5, color: "#475569", lineHeight: 1.8, maxWidth: 500, marginBottom: 32 }}>
              A policy runtime that controls what AI agents can do. Intercept tool calls, enforce YAML rules, and mask PII — across every major agentic framework.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => go("quickstart")} style={{ padding: "10px 22px", borderRadius: 8, background: "#4f46e5", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 0 26px #4f46e540" }}>Quick Start →</button>
              <button onClick={() => go("python")} style={{ padding: "10px 22px", borderRadius: 8, background: "transparent", color: "#475569", border: "1px solid #d5e2f2", fontWeight: 500, fontSize: 13.5, cursor: "pointer" }}>View Examples</button>
            </div>
          </div>

          {/* OVERVIEW */}
          <Section id="overview" title="Overview">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.85, marginBottom: 28 }}>
              Megent sits between your orchestration layer and your AI agents, intercepting every tool call before it executes. You define rules in a simple YAML file — Megent enforces them at runtime, masking PII in outputs, blocking dangerous operations, and logging every decision to a structured audit trail.
            </p>

            {/* Flow */}
            <div style={{ background: "#ffffff", border: "1px solid #d7e2f2", borderRadius: 12, padding: "28px 20px", marginBottom: 28, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
                {[
                  { l: "LLM / Orchestrator", c: "#6366f1" }, null,
                  { l: "Megent Runtime", c: "#34d399", glow: true }, null,
                  { l: "Tool Function", c: "#f59e0b" },
                ].map((x, i) => x === null ? (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
                    <div style={{ width: 24, height: 1, background: "#d5e2f2" }} />
                    <span style={{ color: "#64748b", fontSize: 16, lineHeight: 1 }}>›</span>
                  </div>
                ) : (
                  <div key={i} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${x.c}${x.glow?"60":"22"}`, background: x.glow ? x.c+"10" : "#f5f9ff", boxShadow: x.glow ? `0 0 24px ${x.c}18` : "none" }}>
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: x.c, fontFamily: "JetBrains Mono,monospace" }}>{x.l}</p>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 14, fontSize: 11, color: "#94a3b8" }}>policy.yaml defines rules · runtime enforces · audit.log records all decisions</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { icon: "🛡", t: "Deny-by-default", d: "Block any tool call not explicitly allowed." },
                { icon: "🔏", t: "PII Masking", d: "Strip sensitive fields from tool outputs." },
                { icon: "📋", t: "Audit Trail", d: "Structured JSON log of every decision." },
                { icon: "🔗", t: "Any Framework", d: "Python, TS, LangChain, CrewAI, OpenAI." },
                { icon: "🎯", t: "Glob Matching", d: "Match tools with patterns like delete_*." },
                { icon: "🪪", t: "JWT Identity", d: "Per-agent passports with scoped permissions." },
              ].map(c => (
                <div key={c.t} style={{ padding: 16, borderRadius: 9, background: "#ffffff", border: "1px solid #d7e2f2" }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{c.icon}</div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{c.t}</p>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{c.d}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* INSTALLATION */}
          <Section id="installation" title="Installation" badge="pip · npm">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              Megent provides first-class packages for Python and TypeScript. Pick whichever matches your agent stack.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Python", cmd: "pip install megent", color: "#6366f1" },
                { label: "TypeScript / Node", cmd: "Coming soon", color: "#60a5fa", soon: true },
              ].map(p => (
                <div key={p.label} style={{ borderRadius: 9, overflow: "hidden", border: "1px solid #d5e2f2" }}>
                  <div style={{ padding: "9px 15px", background: "#f5f9ff", borderBottom: "1px solid #d5e2f2" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: p.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {p.label}
                      {p.soon && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c3aed", border: "1px solid #ddd6fe", background: "#f5f3ff", borderRadius: 999, padding: "1px 6px" }}>
                          Soon
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ padding: "14px 16px", background: "#ffffff" }}>
                    <code style={{ color: p.soon ? "#94a3b8" : "#34d399", fontSize: 12.5, fontFamily: "JetBrains Mono,monospace" }}>{p.cmd}</code>
                  </div>
                </div>
              ))}
            </div>
            <Callout type="tip" title="Recommended: use a virtual environment">
              Run <code style={{ color: "#22c55e", fontSize: 11.5 }}>python -m venv .venv && source .venv/bin/activate</code> before pip installing to keep your project dependencies isolated.
            </Callout>
          </Section>

          {/* QUICKSTART */}
          <Section id="quickstart" title="Quick Start">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              Two lines to initialize, one decorator to enforce. Here&apos;s everything you need to get running:
            </p>
            <CodeBlock lang="python" filename="main.py" code={`import megent
      from any_agent_sdk import AgentToolkit

      # Load your policy file
      mgnt = megent.init(policy="policy.yaml")


      # Decorate your own tools
      @mgnt.guard
      def get_user(user_id: str):
        return {"id": user_id, "email": "alice@acme.com"}


      # Or wrap a third-party agent or toolkit
      safe_agent = mgnt.wrap(AgentToolkit())`} />
          </Section>

          {/* POLICY YAML */}
          <Section id="policy-yaml" title="Policy YAML" badge="core">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              All rules live in a single YAML file. Rules are evaluated top-to-bottom — the first match wins and evaluation stops.
            </p>
            <CodeBlock code={YAML_POLICY} lang="yaml" filename="policy.yaml" />

            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #d5e2f2" }}>
              <div style={{ padding: "11px 20px", background: "#f5f9ff", borderBottom: "1px solid #d5e2f2" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Rule Schema</span>
              </div>
              <div style={{ background: "#ffffff" }}>
                <PropRow name="id" type="string" req desc="Unique identifier referenced in audit logs and error messages." />
                <PropRow name="description" type="string" desc="Human-readable explanation of what this rule does." />
                <PropRow name="match.tool" type="glob" req desc="Tool name glob. Supports * wildcard. e.g. delete_*, get_user, *" />
                <PropRow name="action" type="enum" req desc="One of: allow · deny · mask" />
                <PropRow name="fields" type="string[]" desc="For mask: field names to redact from the tool output." />
                <PropRow name="reason" type="string" desc="For deny: custom message included in MegentDenyError." />
              </div>
            </div>
          </Section>

          {/* ACTIONS */}
          <Section id="actions" title="Actions">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 24 }}>
              Every rule must declare one of three actions. Actions determine what the runtime does when a tool call matches.
            </p>
            {[
              { a: "allow", c: "#22c55e", d: "The tool call is permitted to execute normally. Execution passes through to the underlying function.", code: `- id: allow-reads\n  match:\n    tool: "get_*"\n  action: allow` },
              { a: "deny", c: "#f87171", d: "The tool call is blocked before execution. A MegentDenyError is raised with an optional reason. The function is never called.", code: `- id: block-delete\n  match:\n    tool: "delete_*"\n  action: deny\n  reason: "Deletion requires human approval"` },
              { a: "mask", c: "#fb923c", d: "The tool call executes, but specified fields in the return value are redacted. Runs after the function returns, before the result reaches the LLM.", code: `- id: mask-pii\n  match:\n    tool: "*"\n  action: mask\n  fields: [email, phone, ssn]` },
            ].map(x => (
              <div key={x.a} style={{ borderRadius: 9, overflow: "hidden", border: `1px solid ${x.c}18`, background: "#ffffff", marginBottom: 12 }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${x.c}14`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <code style={{ color: x.c, fontWeight: 800, fontSize: 14, fontFamily: "JetBrains Mono,monospace", minWidth: 50 }}>{x.a}</code>
                  <p style={{ color: "#475569", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{x.d}</p>
                </div>
                <div style={{ padding: "14px 20px", background: "#f8fbff" }}>
                  <pre style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "JetBrains Mono,monospace", lineHeight: 1.75 }}>{x.code}</pre>
                </div>
              </div>
            ))}
          </Section>

          {/* PII MASKING */}
          <Section id="pii-masking" title="PII Masking" badge="automatic">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              The <code style={{ color: "#34d399", fontSize: 12.5 }}>mask</code> action walks the return value recursively and replaces any matching key with <code style={{ color: "#34d399", fontSize: 12.5 }}>***</code>.
            </p>
            <CodeBlock lang="python" filename="masking-demo.py" code={`# policy.yaml
- id: mask-pii
  match:
    tool: "*"
  action: mask
  fields: [email, phone, ssn, credit_card]

# agent.py
@mgnt.guard
def get_user(user_id: str):
    return {
        "id": user_id,
        "name": "Alice Smith",       # ← untouched
        "email": "alice@acme.com",   # ← masked
        "phone": "555-0192",         # ← masked
    "ssn": "123-45-6789",        # ← masked
    }

result = get_user("u_001")
# → {
#     "id":    "u_001",
#     "name":  "Alice Smith",
#     "email": "***",
#     "phone": "***",
#     "ssn":   "***"
#   }`} />
            <Callout type="info" title="Recursive masking">
              Megent walks nested dicts and lists to any depth. You don&apos;t need to specify the path — just the field name.
            </Callout>
          </Section>

          {/* FRAMEWORK DEMOS — shared section for all 5 */}
          <Section id="python" title="Framework Examples" badge="5 SDKs">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 28 }}>
              The same <code style={{ color: "#4338ca", fontSize: 12.5 }}>policy.yaml</code> enforces your rules across every major framework. Switch tabs to see the full example for each SDK.
            </p>
            <FrameworkDemos />
          </Section>

          {/* AUDIT LOGS */}
          <Section id="audit-logs" title="Audit Logs" badge="auto-generated">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              Every intercepted tool call is appended to <code style={{ color: "#4338ca", fontSize: 12.5 }}>audit.log</code> as newline-delimited JSON. No configuration required — it&apos;s on by default.
            </p>
            <CodeBlock lang="json" filename="audit.log" code={`{"ts":"2026-03-30T09:00:01Z","agent":"production-agent","tool":"get_user","action":"allow","rule":"allow-reads","masked_fields":["email","phone","ssn"],"duration_ms":4}
{"ts":"2026-03-30T09:00:02Z","agent":"production-agent","tool":"delete_user","action":"deny","rule":"block-delete","reason":"No agent may delete any resource","duration_ms":0}
{"ts":"2026-03-30T09:00:03Z","agent":"production-agent","tool":"transfer_funds","action":"deny","rule":"restrict-payments","reason":"Payment actions require human approval","duration_ms":0}`} />

            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #d5e2f2" }}>
              <div style={{ padding: "11px 20px", background: "#f5f9ff", borderBottom: "1px solid #d5e2f2" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Log Fields</span>
              </div>
              <div style={{ background: "#ffffff" }}>
                <PropRow name="ts" type="ISO 8601" desc="Timestamp of the intercepted call." />
                <PropRow name="agent" type="string" desc="Agent ID from policy.yaml or JWT." />
                <PropRow name="tool" type="string" desc="Name of the function that was called." />
                <PropRow name="action" type="enum" desc="Outcome: allow · deny · mask" />
                <PropRow name="rule" type="string" desc="ID of the rule that matched." />
                <PropRow name="reason" type="string" desc="Denial message if set in the rule." />
                <PropRow name="masked_fields" type="string[]" desc="Fields redacted in output, if action is mask." />
                <PropRow name="duration_ms" type="number" desc="Milliseconds from intercept to return." />
              </div>
            </div>
          </Section>

          {/* JWT IDENTITY */}
          <Section id="jwt-identity" title="JWT Identity" badge="coming soon" badgeColor="#f59e0b">
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.8, marginBottom: 20 }}>
              Issue each agent a signed JWT passport with scoped tool permissions. Megent validates the token on every call and enforces per-agent rules.
            </p>
            <CodeBlock lang="python" filename="jwt-demo.py" code={`# Issue a scoped passport for a specific agent
token = mgnt.issue_passport(
    agent_id="data-analyst-v2",
    scopes=["get_*", "list_*"],   # only these tools are allowed
    expires_in=3600,               # 1-hour TTL
)

# Agent initializes with its passport
mgnt_agent = megent.init(
    policy="policy.yaml",
    jwt=token,                     # validated on every call
)

@mgnt_agent.guard
def get_transactions(account_id: str):
    ...  # ✓ in passport scopes

@mgnt_agent.guard
def delete_account(account_id: str):
    ...  # ✗ not in passport scopes → MegentDenyError`} />
            <Callout type="warning" title="In development — v0.2.0">
              JWT identity is on the roadmap. The API shown is a preview and may change before release.
            </Callout>
          </Section>

          {/* FOOTER CTA */}
          <div style={{ marginTop: 80, padding: 44, borderRadius: 14, textAlign: "center", background: "linear-gradient(135deg,#eef2ff 0%,#ffffff 60%)", border: "1px solid #e9edff", boxShadow: "0 0 60px #4f46e514" }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 0 28px #4f46e540" }}>
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "Bricolage Grotesque,sans-serif" }}>M</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0b1220", fontFamily: "Bricolage Grotesque,sans-serif", letterSpacing: "-0.025em", marginBottom: 10 }}>Ready to control your agents?</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Open source · MIT licensed · Works with any LLM framework</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={{ padding: "10px 24px", borderRadius: 8, background: "#4f46e5", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 0 28px #4f46e548" }}>pip install megent</button>
              <button style={{ padding: "10px 24px", borderRadius: 8, background: "transparent", color: "#475569", border: "1px solid #d5e2f2", fontWeight: 500, fontSize: 13.5, cursor: "pointer" }}>View on GitHub →</button>
            </div>
          </div>
        </main>

        {/* RIGHT OUTLINE */}
        <aside style={{ width: 196, flexShrink: 0, position: "sticky", top: 58, height: "calc(100vh - 58px)", padding: "28px 20px", overflowY: "auto", borderLeft: "1px solid #d7e2f2" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>On this page</p>
          {NAV_SECTIONS.flatMap(s => s.items).map(item => (
            <button key={item.id} onClick={() => go(item.id)} style={{
              display: "block", textAlign: "left", padding: "5px 0", fontSize: 12,
              color: active === item.id ? "#4338ca" : "#64748b",
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontWeight: active === item.id ? 600 : 400, transition: "color 0.12s",
            }}>{item.label}</button>
          ))}
        </aside>
      </div>
    </div>
  );
}
