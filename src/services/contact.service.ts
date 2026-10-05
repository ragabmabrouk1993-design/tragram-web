"use client";

import {
  postApiSupportContactSubmissions,
  type PostApiSupportContactSubmissionsData,
} from "@/lib/api-client";
import { client } from "@/lib/api-client/client.gen";
import { initApiClient } from "@/lib/api-client-setup";

initApiClient();

export type CreateContactSubmissionPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject?: string;
  type?: PostApiSupportContactSubmissionsData["body"]["type"] | "ACCOUNT_DELETION_ACCESS";
  message: string;
  locale: string;
  pagePath: string;
  website?: string;
  accountDeletion?: {
    requestedAction: "DELETE_ACCOUNT" | "CANCEL_SCHEDULED_DELETION";
    requestedMode?: "IMMEDIATE" | "SCHEDULED";
    accessProblem:
      | "PASSWORD_UNAVAILABLE"
      | "TELEGRAM_CODE_NOT_RECEIVED"
      | "OTHER";
    acknowledgements: {
      brokerControlUnderstood: true;
      retentionUnderstood: true;
      prepaidAccessUnderstood: true;
    };
  };
};

type CreateContactSubmissionResponse = {
  success: boolean;
  submissionId: string | null;
};

export const contactService = {
  async createSubmission(
    payload: CreateContactSubmissionPayload
  ): Promise<CreateContactSubmissionResponse> {
    const response = await postApiSupportContactSubmissions({
      body: payload as unknown as PostApiSupportContactSubmissionsData["body"],
      client,
      throwOnError: true,
    });

    return response.data as CreateContactSubmissionResponse;
  },
};
