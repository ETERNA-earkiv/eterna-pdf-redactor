import { FiChevronUp } from "react-icons/fi";

type PreviousPageProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function PreviousPage(props: PreviousPageProps) {
	return (
		<button type="button" onClick={props.onClick} disabled={props.disabled}>
			<FiChevronUp />
		</button>
	);
}

export default PreviousPage;