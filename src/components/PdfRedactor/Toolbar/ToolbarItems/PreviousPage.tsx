import { FiChevronUp } from "react-icons/fi";

type PreviousPageProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
};

function PreviousPage(props: PreviousPageProps) {
	return (
		<button type="button" onClick={props.onClick}>
			<FiChevronUp />
		</button>
	);
}

export default PreviousPage;