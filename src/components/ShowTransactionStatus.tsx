import { CircularProgress } from '@mui/material';
import { useState } from 'react';

interface ShowTransactionStatusFieldProps {
  loading: boolean; // Change to the correct type if necessary
  statusArray: string[];
}

const ShowTransactionStatus = ({
  statusArray,
  loading,
}: ShowTransactionStatusFieldProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ margin: '10px', width: '100%' }}>
      <>
        <div
          style={{
            maxHeight: '150px',
            padding: '5px',
            height: expanded
              ? '150px'
              : statusArray.length > 1
              ? 'auto'
              : '0px',
            transition: 'height 0.5s ease-in-out', // Smooth height transition
            overflowY: expanded ? 'auto' : 'hidden',
            textAlign: 'left',
            border: expanded ? '3px solid lightgrey' : '',
          }}
        >
          {expanded ? (
            <>
              {statusArray.map((item, index) => (
                <div key={index}>
                  {item}
                  {loading && index === 0 ? (
                    <>
                      <CircularProgress size={12} />
                    </>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <>
              {statusArray.length > 1 ? (
                <>
                  {statusArray[0]}
                  {loading ? (
                    <>
                      <CircularProgress size={12} />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
        {statusArray.length > 1 ? (
          <div style={{ display: 'flex' }}>
            <div style={{ width: '0%' }}></div>
            <div style={{ width: '100%' }}>
              <button
                onClick={() => {
                  setExpanded(!expanded);
                }}
                style={{ width: '100%', paddingTop: '16px' }}
              >
                Show/Hide
              </button>
            </div>
          </div>
        ) : (
          <></>
        )}
      </>
    </div>
  );
};

export default ShowTransactionStatus;
