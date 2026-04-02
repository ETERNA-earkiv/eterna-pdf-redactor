import { FiCornerUpLeft } from "react-icons/fi";

type UndoProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function Undo(props: UndoProps) {
	return (
		<button
			type="button"
			title="Ångra"
			onClick={props.onClick}
			disabled={props.disabled}
		>
			<FiCornerUpLeft />
		</button>
	);
}

export default Undo;
