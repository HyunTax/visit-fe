const BASE = "http://14.6.25.24:8080/v1/visit";

export class UnauthorizedError extends Error {}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json() as { message?: string };
    return data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export type ReservationStatus = "WAIT" | "CONFIRM" | "REJECT";

export interface ReservationDetail {
  id: number;
  name: string;
  phoneNum: string;
  visitDate: string;
  visitorCount: number;
  hasAllergy: boolean;
  memo: string;
  status: ReservationStatus;
}

export async function postAuth(body: {
  name: string;
  phoneNum: string;
  password: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "인증 실패"));
  return (await res.text()).trim();
}

export async function postReservation(body: {
  name: string;
  phoneNum: string;
  visitDate: string;
  visitorCount: number;
  hasAllergy: boolean;

  memo: string;
  password: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/reservation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "예약 실패"));
}

export async function getReservation(token: string, params: {
  name: string;
  phoneNum: string;
  password: string;
}): Promise<ReservationDetail> {
  const query = new URLSearchParams({ ...params }).toString();
  const res = await fetch(`${BASE}/reservation/find?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await parseErrorMessage(res, "예약 조회 실패"));
  return res.json() as Promise<ReservationDetail>;
}

export async function putReservation(
  token: string,
  id: number,
  body: { visitDate: string; visitorCount: number; hasAllergy: boolean; memo: string }
): Promise<void> {
  const res = await fetch(`${BASE}/reservation/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await parseErrorMessage(res, "예약 수정 실패"));
}

export async function deleteReservation(token: string, id: number): Promise<void> {
  const res = await fetch(`${BASE}/reservation/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await parseErrorMessage(res, "예약 취소 실패"));
}
