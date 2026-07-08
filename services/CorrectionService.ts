import type { CorrectionRequest } from "@/types"

export class CorrectionService {
  static checkDuplicateRequest(
    requests: CorrectionRequest[],
    recordId: string,
    studentId: string
  ): boolean {
    return requests.some(
      (request) =>
        request.status === "pending" &&
        request.recordId === recordId &&
        request.studentId === studentId
    )
  }
}
