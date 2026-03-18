import TextRedactorIcon from "../../../../assets/text-redactor.svg";

type TextRedactorProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function TextRedactor(props: TextRedactorProps) {
	const imgSrc = new URL(TextRedactorIcon, import.meta.url).href;

	return (
		<button
			type="button"
			onClick={props.onClick}
			data-selected={props.selected}
			title="Maskera text"
		>
			<img src={imgSrc} alt="Redactor tool" height="24" />
		</button>
	);
}

export default TextRedactor;
