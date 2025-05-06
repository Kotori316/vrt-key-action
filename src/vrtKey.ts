import { debug } from "@actions/core";
import * as http from "@actions/http-client";
import { BearerCredentialHandler } from "@actions/http-client/lib/auth";

type Success = {
    success: true;
    data: string;
};
type AccessError = {
    success: false;
    error: string;
};
type AccessResult = Success | AccessError;

export default {
    get,
    put,
};

async function get(
    endpoint: string,
    owner: string,
    repository: string,
    branch: string,
): Promise<AccessResult> {
    const url = `${endpoint}/${owner}/${repository}/${branch}`;
    debug(`Fetching ${url}`);
    try {
        const client = new http.HttpClient(
            `vrt-key-action/${owner}/${repository}/${branch}`,
        );
        const response = await client.get(url);
        if (
            !response.message.statusCode ||
            response.message.statusCode < 200 ||
            response.message.statusCode >= 300
        ) {
            const result = JSON.parse(await response.readBody());
            return {
                success: false,
                error:
                    getErrorMessage(result) ??
                    `${response.message.statusCode} ${response.message.statusMessage}`,
            };
        }

        const data = await response.readBody();
        return {
            success: true,
            data,
        };
    } catch (_error) {
        return {
            success: false,
            error: "Unknown error",
        };
    }
}

async function put(
    endpoint: string,
    owner: string,
    repository: string,
    branch: string,
    token: string,
    data: string,
): Promise<AccessResult> {
    const client = new http.HttpClient(
        `vrt-key-action/${owner}/${repository}/${branch}`,
        [new BearerCredentialHandler(token)],
    );
    try {
        const response = await client.put(
            `${endpoint}/${owner}/${repository}/${branch}`,
            data,
        );
        const result = JSON.parse(await response.readBody());
        if (
            !response.message.statusCode ||
            response.message.statusCode < 200 ||
            response.message.statusCode >= 300
        ) {
            return {
                success: false,
                error:
                    getErrorMessage(result) ??
                    `${response.message.statusCode} ${response.message.statusMessage}`,
            };
        }
        return {
            success: true,
            data,
        };
    } catch (_error) {
        return {
            success: false,
            error: "Unknown error",
        };
    }
}

function getErrorMessage(result: unknown): string | undefined {
    if (!result) {
        return undefined;
    }
    if (typeof result !== "object") {
        return undefined;
    }
    if (!("error" in result)) {
        return undefined;
    }
    if (typeof result.error !== "string") {
        return undefined;
    }
    return result.error;
}
