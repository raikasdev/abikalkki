import { useCallback, useState, useRef, useEffect } from 'preact/hooks'
import { calculate } from './math';
import Decimal from 'decimal.js';
import prettify from './math/prettify';
import { latexToMath } from './math/latex-to-math';
import Logo from './components/Logo';
import HistoryLine, { HistoryLineData } from './components/HistoryLine';
import { getOpenFunction, MathError, parseError } from './util';
import './app.scss'
import { getDocumentation } from './functions';

export function App() {
  const [answer, setAnswer] = useState<Decimal>(new Decimal(0));
  const [ind, _setInd] = useState<Decimal>(new Decimal(0));
  const [answers, setAnswers] = useState<HistoryLineData[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [extraInfo, setExtraInfo] = useState<string | null>(null);
  const [latex, setLatex] = useState(false);

  useEffect(() => {
    // Focus on any keyboard activity
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't capture if user is typing in another input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      inputRef.current?.focus();
    };

    // Focus on window focus
    const handleFocus = () => {
      inputRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!inputRef.current) return;
    const input = inputRef.current.value;

    if (event.key === 'Enter') {
      const res = calculate(input, answer, ind, "deg");
      if (res.isErr()) {
        return;
      }
      const { value } = res;
      setAnswer(value);
      setExtraInfo('');
      inputRef.current.value = "";

      setAnswers((answers) => [{
        expression: prettify(input),
        answer: value,
        latex,
      }, ...answers]);
      setLatex(false);
    } else {
      if (input === '') {
        setExtraInfo('');
        return;
      }

      const openFunction = getOpenFunction(input);
      if (openFunction !== null) {
        const doc = getDocumentation(openFunction);
        if (doc) {
          setExtraInfo(doc.usage);
          return;
        }
      }

      const res = calculate(input, answer, ind, "deg");
      if (res.isErr()) {
        setExtraInfo(parseError(res.error as unknown as MathError));
      } else {
        setExtraInfo(res.value.toDecimalPlaces(8).toString().replace('.', ','))
      }
    }
  }, [inputRef, answer, ind, latex]);

  const pasteLatex = useCallback((event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    // Get the pasted content
    const pastedContent = event.clipboardData.getData('text');

    // Get the target input element
    const input = event.target as HTMLInputElement;

    // Check if paste replaces entire content or input is empty
    if (!input.value || input.selectionStart === 0 && input.selectionEnd === input.value.length) {
      // Check if pasted content contains backslashes
      if (pastedContent.includes('\\')) {
        // Process entire string through latexToMath
        if (inputRef.current) inputRef.current.value = latexToMath(pastedContent);

        // Prevent default paste behavior
        event.preventDefault();

        setLatex(true);
      }
    }
  }, [inputRef, answer, ind]);

  // Handle global paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't capture if user is pasting in another input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      inputRef.current?.focus();
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <>
      <div class="history">
        <div className={`welcome-message${answers.length > 0 ? ' hidden' : ''}`}>
          <Logo height="128" width="128" />
          <h1>Abikalkki</h1>
          <p>Tervetuloa käyttämään Abikalkkia!</p>
          <p>Aloita kirjoittamalla lauseke alla olevaan kenttään.</p>
          <p class="hide-pwa-prompt">Tietokoneella parhaan kokemuksen saat <span id="pwa-install-prompt" hidden><a href="#" onClick={() => (window as any).installPWA()}>asentamalla sen PWA-sovelluksena</a> tai </span><a href="/app">iframe-tilassa</a>.</p>
        </div>
        {answers.map((line, index) => <HistoryLine key={`line-${index}`} inputRef={inputRef} {...line} />)}
      </div>
      <div class="input">
        {extraInfo && <div class="extra-info">
          <p dangerouslySetInnerHTML={{ __html: extraInfo }} />
        </div>}
        <input
          ref={inputRef}
          name="math-line"
          onKeyUp={handleKeyDown}
          onPaste={pasteLatex}
          autoFocus
          spellcheck={false}
          autocomplete="off"
        />
      </div>
    </>
  )
}
