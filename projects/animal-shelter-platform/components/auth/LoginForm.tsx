"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  loginAction,
  type LoginActionState
} from "@/app/actions/auth.actions";

const initialState: LoginActionState = {
  message: ""
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded border border-shelter-ink/10 bg-white p-5">
      <label className="grid gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
        <FieldError errors={state.fieldErrors?.email} />
      </label>
      <label className="grid gap-1 text-sm">
        Пароль
        <input
          name="password"
          type="password"
          required
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
        <FieldError errors={state.fieldErrors?.password} />
      </label>
      {state.message ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <LoginButton />
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <span className="text-xs text-red-700">{errors[0]}</span>;
}

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? "Входим..." : "Войти"}
    </button>
  );
}
