import TextRedactorIcon from "../../../../assets/text-redactor.svg";

type TextRedactorProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function TextRedactor(props: TextRedactorProps) {
	return (
		<button
			type="button"
			onClick={props.onClick}
			data-selected={props.selected}
		>
			<img src={TextRedactorIcon} alt="Redactor tool" height="24" />
		</button>
	);
}

export default TextRedactor;
