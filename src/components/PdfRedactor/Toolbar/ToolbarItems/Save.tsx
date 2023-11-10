import { FiSave } from "react-icons/fi";

type SaveProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function Save(props: SaveProps) {
	return (
		<button type="button" onClick={props.onClick} disabled={props.disabled}>
			<FiSave />
		</button>
	);
}

export default Save;