## Delegation rules
- Main session (Opus) = orchestrator: planning, architecture, game design, hard debugging and reviewing all work. Big tasks stay here.
- Medium tasks (implementing designed features) → `builder` subagent (Sonnet).
- Small mechanical tasks (assets, ffmpeg, config text, timings, CSS tweaks, running builds) → `helper` subagent (Haiku).
- Tiny tasks or anything needing back-and-forth with me: do directly.
- Give every subagent a complete, self-contained brief; they start with no context.
- Review each subagent's result before moving on.
- Always show me the plan in plain English and wait for approval before executing anything big.
