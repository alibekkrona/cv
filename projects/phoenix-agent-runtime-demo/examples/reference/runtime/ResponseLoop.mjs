function functionCalls(response) {
    return (response?.output || [])
        .filter(item => item.type === 'function_call')
        .map(item => ({
            callId: item.call_id,
            name: item.name,
            arguments: item.arguments
        }));
}

function finalText(response) {
    if (typeof response?.output_text === 'string') {
        return response.output_text;
    }

    return (response?.output || [])
        .filter(item => item.type === 'message')
        .flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text')
        .map(item => item.text)
        .join('\n');
}

function assertToolOutputCompleteness(calls, outputs) {
    const returnedIds = new Set(outputs.map(item => item.call_id));
    const missing = calls
        .map(call => call.callId)
        .filter(callId => !returnedIds.has(callId));

    if (missing.length) {
        throw new Error(
            `Missing function_call_output for: ${missing.join(', ')}`
        );
    }
}

export async function runResponseLoop({
    client,
    model,
    instructions,
    input,
    toolSpecs,
    dispatcher,
    taskPackage,
    conversationStore,
    maxTurns = 12
}) {
    const conversation = conversationStore.get(taskPackage.projectId);
    let response = await client.responses.create({
        model,
        instructions,
        input,
        tools: toolSpecs,
        previous_response_id: conversation?.previousResponseId
    });

    for (let turn = 1; turn <= maxTurns; turn += 1) {
        conversationStore.remember(taskPackage.projectId, response);
        const calls = functionCalls(response);

        if (!calls.length) {
            return {
                responseId: response.id,
                text: finalText(response),
                turns: turn
            };
        }

        const outputs = [];

        for (const call of calls) {
            try {
                const result = await dispatcher.dispatch(call, taskPackage);
                outputs.push({
                    type: 'function_call_output',
                    call_id: call.callId,
                    output: JSON.stringify({ ok: true, result })
                });
            } catch (error) {
                outputs.push({
                    type: 'function_call_output',
                    call_id: call.callId,
                    output: JSON.stringify({
                        ok: false,
                        error: error.message
                    })
                });
            }
        }

        assertToolOutputCompleteness(calls, outputs);

        response = await client.responses.create({
            model,
            previous_response_id: response.id,
            input: outputs,
            tools: toolSpecs
        });
    }

    throw new Error(`Response loop exceeded ${maxTurns} turns`);
}

export {
    assertToolOutputCompleteness,
    finalText,
    functionCalls
};
