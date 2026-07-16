export class FakeResponsesClient {
    constructor(script) {
        this.script = [...script];
        this.requests = [];
        this.responses = {
            create: async request => {
                this.requests.push(structuredClone(request));
                const response = this.script.shift();
                if (!response) {
                    throw new Error('Fake response script exhausted');
                }
                return structuredClone(response);
            }
        };
    }
}

export function writeThenReadScript() {
    return [
        {
            id: 'response-1',
            output: [{
                type: 'function_call',
                call_id: 'call-write',
                name: 'write_text_file',
                arguments: JSON.stringify({
                    path: 'artifacts/result.txt',
                    content: 'Verified agent artifact'
                })
            }]
        },
        {
            id: 'response-2',
            output: [{
                type: 'function_call',
                call_id: 'call-read',
                name: 'read_text_file',
                arguments: JSON.stringify({
                    path: 'artifacts/result.txt'
                })
            }]
        },
        {
            id: 'response-3',
            output_text: 'Created and verified artifacts/result.txt.'
        }
    ];
}
