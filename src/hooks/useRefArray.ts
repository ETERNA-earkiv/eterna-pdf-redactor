import { MutableRefObject, RefObject, createRef } from "react";

// convenience overload for refs given as a ref prop as they typically start with a null value
/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * Usage note: if you need the result of useRef to be directly mutable, include `| null` in the type
 * of the generic argument.
 *
 * @version 16.8.0
 * @see https://react.dev/reference/react/useRef
 */
export function useRefArray<T>(
	arrayLength: number,
	initialValue: T | null,
): RefObject<T>[];

// convenience overload for potentially undefined initialValue / call with 0 arguments
// has a default to stop it from defaulting to {} instead
/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see https://react.dev/reference/react/useRef
 */
export function useRefArray<T = undefined>(
	arrayLength: number,
): MutableRefObject<T | undefined>[];

/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see https://react.dev/reference/react/useRef
 */
export function useRefArray<T>(
	arrayLength: number,
	initialValue: T,
): MutableRefObject<T>[];

/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see https://react.dev/reference/react/useRef
 */
export function useRefArray<T>(
	arrayLength: number,
	initialValue: T | null | undefined = undefined,
): MutableRefObject<T | null | undefined>[] {
	return Array.from({ length: arrayLength }, (_) => {
		const ref = createRef<T | null | undefined>() as MutableRefObject<
			T | null | undefined
		>;
		ref.current = initialValue;
		return ref;
	});
}
