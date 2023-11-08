import { FiChevronDown } from "react-icons/fi";

type NextPageProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
};

function NextPage(props: NextPageProps) {
	return (
		<button type="button" onClick={props.onClick}>
			<FiChevronDown />
		</button>
	);
}

export default NextPage;