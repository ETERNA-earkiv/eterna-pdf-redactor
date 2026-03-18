import { FiRotateCw } from "react-icons/fi";

type ResetProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function Reset(props: ResetProps) {
	return (
		<button
			type="button"
			title="Rensa alla maskeringar"
			onClick={props.onClick}
			disabled={props.disabled}
		>
			<FiRotateCw />
		</button>
	);
}

export default Reset;
