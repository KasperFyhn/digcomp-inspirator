import '../common.scss';
import { DefaultGenerationService } from './GenerationService';
import React, { useEffect, useRef, useState } from 'react';
import {
  GenerationOptions,
  GenerationOptionsMetadata,
  initGenerationOptions,
  UiLevel,
} from './models';
import Markdown from 'react-markdown';

import { OptionsPanel } from './OptionsPanel';
import { Notification } from '../common/Notification';

const service = new DefaultGenerationService();

interface GeneratorPageProps {
  uiLevel: UiLevel;
}

export const GeneratorPage: React.FC<GeneratorPageProps> = ({
  uiLevel,
}: GeneratorPageProps) => {
  const [optionsMetadata, setOptionsMetadata] = useState<
    GenerationOptionsMetadata | undefined
  >(undefined);

  const [options, setOptions] = useState<GenerationOptions>(
    new GenerationOptions(),
  );

  useEffect(() => {
    service.getGenerationOptionsMetadata(uiLevel).then((metadata) => {
      setOptionsMetadata(() => metadata);
      setOptions(() => initGenerationOptions(metadata));
    });
  }, [uiLevel]);

  const [creatingResponse, setCreatingResponse] = useState(false);
  const [response, setResponse] = useState<string | undefined>(undefined);
  const markdownRef = useRef<HTMLDivElement>(null);

  const createResponse: () => void = () => {
    setCreatingResponse(true);
    setResponse(() => '');
    service.generateAsStream(
      options,
      (event: MessageEvent) => {
        setResponse(
          (prevResponse) =>
            prevResponse +
            event.data.toString().replaceAll('\\n', '\n').replaceAll('•', '-'),
        );
      },
      () => setCreatingResponse(false),
    );
  };

  const createPrompt: () => void = () => {
    service.createPrompt(options).then((prompt) => {
      setResponse(prompt);
      setCreatingResponse(false);
    });
  };

  const [responseCopied, setResponseCopied] = useState(false);
  const onCopy = async (): Promise<void> => {
    if (!markdownRef.current || !response) return;

    const html = markdownRef.current.innerHTML;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          // copying both should let rich text editors take the formatted text
          // and plain text editors take the plain text
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([response], { type: 'text/plain' }),
        }),
      ]);
      setResponseCopied(true);
      setTimeout(() => setResponseCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // for controlling whether help and disclaimer messages have been dismissed
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  if (optionsMetadata === undefined) {
    return <div>Loading...</div>;
  }

  const optionMetadataList = Object.entries(optionsMetadata);

  const topPanelMetadata = optionsMetadata.taxonomies;
  if (optionsMetadata.taxonomies) {
    optionMetadataList.splice(
      optionMetadataList.findIndex((entry) => entry[0] === 'taxonomies'),
      1,
    );
  }

  const halfLength = Math.floor(optionMetadataList.length / 2);
  const leftPanelMetadata = optionMetadataList.slice(0, halfLength);
  const rightPanelMetadata = optionMetadataList.slice(halfLength);

  return (
    <div className={'flex-container--vert'}>
      {topPanelMetadata && (
        <div className={'content-pane flex-container__box padded'}>
          <OptionsPanel
            metadataEntry={['taxonomies', topPanelMetadata]}
            options={options}
            setOptions={setOptions}
          />
        </div>
      )}
      <div className={'flex-container--horiz'}>
        <div className={'content-pane flex-container__box padded'}>
          {leftPanelMetadata
            .map((metadataEntry) => (
              <OptionsPanel
                key={metadataEntry[0]}
                metadataEntry={metadataEntry}
                options={options}
                setOptions={setOptions}
              />
            ))
            .filter((obj) => obj !== undefined)}
        </div>
        <div
          className={
            'content-pane flex-container__box--big size_40percent padded'
          }
        >
          {!response && !helpDismissed && uiLevel === 'Standard' && (
            <Notification
              fetchKey={'help'}
              onDismiss={() => setHelpDismissed(true)}
            />
          )}
          {response && !disclaimerDismissed && (
            <Notification
              fetchKey={'disclaimer'}
              type={'attention'}
              onDismiss={() => setDisclaimerDismissed(true)}
            />
          )}
          {!creatingResponse && (
            <div className={'button-container'}>
              <button onClick={createResponse}>Run prompt on ULGIS</button>
              <button onClick={createPrompt}>Show prompt</button>
            </div>
          )}
          {response && (
            <div
              className={
                'response-container small-vert-margin ' +
                (responseCopied ? 'copy-to-clipboard--confirm' : '')
              }
            >
              {!creatingResponse && (
                <button
                  className={
                    'copy-button ' +
                    (responseCopied ? 'icon-confirm' : 'icon-copy')
                  }
                  onClick={onCopy}
                />
              )}

              <div ref={markdownRef}>
                <Markdown>{response}</Markdown>
              </div>
            </div>
          )}
          {creatingResponse && response === '' && <p>Connecting ...</p>}
          {!creatingResponse && response && response.length > 500 && (
            <div className={'button-container'}>
              <button onClick={createResponse}>Run prompt on ULGIS</button>
              <button onClick={createPrompt}>Show prompt</button>
            </div>
          )}
        </div>
        <div className={'content-pane flex-container__box padded'}>
          {rightPanelMetadata.map((metadataEntry) => (
            <OptionsPanel
              key={metadataEntry[0]}
              metadataEntry={metadataEntry}
              options={options}
              setOptions={setOptions}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
