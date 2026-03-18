import { FiCornerUpRight } from "react-icons/fi";

type RedoProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function Redo(props: RedoProps) {
	return (
		<button
			type="button"
			title="Gör om"
			onClick={props.onClick}
			disabled={props.disabled}
		>
			<FiCornerUpRight />
		</button>
	);
}

export default Redo;
