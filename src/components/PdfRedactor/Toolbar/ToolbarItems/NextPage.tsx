import { FiChevronDown } from "react-icons/fi";

type NextPageProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function NextPage(props: NextPageProps) {
	return (
		<button type="button" onClick={props.onClick} disabled={props.disabled}>
			<FiChevronDown />
		</button>
	);
}

export default NextPage;