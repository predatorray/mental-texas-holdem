export default function GithubProjectLink() {
  return (
    <a title="Fork me on Github" className="github-project-link" href="https://github.com/predatorray/mental-texas-holdem" target="_blank" rel="noopener noreferrer">
      <img src={`${process.env.PUBLIC_URL}/github-mark-white.svg`} alt="Github Project Link"/>
    </a>
  );
}
