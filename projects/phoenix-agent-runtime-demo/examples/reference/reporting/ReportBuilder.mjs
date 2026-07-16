export function buildReport(outcome) {
    const lines = [
        `# Agent Run ${outcome.runId}`,
        '',
        `- Package: \`${outcome.packageId}\``,
        `- Project: \`${outcome.projectId}\``,
        `- Status: **${outcome.status}**`,
        `- Tool events: ${outcome.toolEvents.length}`,
        '',
        '## Tasks',
        ''
    ];

    for (const task of outcome.taskResults) {
        lines.push(
            `### ${task.taskId}: ${task.title}`,
            '',
            `- Status: **${task.status}**`,
            `- Model turns: ${task.turns}`,
            `- Response ID: \`${task.responseId || 'N/A'}\``,
            '',
            task.summary || task.error || 'No summary produced.',
            ''
        );
    }

    lines.push(
        '## Tool Event Summary',
        '',
        '```json',
        JSON.stringify(outcome.toolEventSummary, null, 2),
        '```',
        ''
    );

    return lines.join('\n');
}
