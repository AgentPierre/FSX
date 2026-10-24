"use client";

import { useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";

/** Props for a <dialog> that should close when the backdrop (outside the panel) is clicked. */
export function useBackdropClose(ref: RefObject<HTMLDialogElement | null>) {
  const pressStartedOutside = useRef(false);
  const outside = (event: { target: EventTarget; clientX: number; clientY: number }) => {
    const dialog = ref.current;
    // The backdrop is part of the dialog element, so a click on it targets the dialog itself.
    if (!dialog || event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDialogElement>) => { pressStartedOutside.current = outside(event); },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (pressStartedOutside.current && outside(event)) ref.current?.close();
      pressStartedOutside.current = false;
    },
  };
}
