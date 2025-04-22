import TextRedactorIcon from "../../../../assets/text-redactor.svg";

type TextRedactorProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function TextRedactor(props: TextRedactorProps) {
	const imgSrc = new URL(
		`${import.meta.env.VITE_URL_PREFIX ?? ''}${TextRedactorIcon}`,
		import.meta.url,
	).toString();

	return (
		<button
			type="button"
			onClick={props.onClick}
			data-selected={props.selected}
		>
			<img src={imgSrc} alt="Redactor tool" height="24" />
		</button>
	);
}

export default TextRedactor;
