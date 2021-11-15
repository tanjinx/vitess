import { useState } from 'react';

interface Props {
    label: string;
}

export const Dropdown: React.FunctionComponent<Props> = ({ children, label }) => {
    const [isOpen, setOpen] = useState(false);
    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="text-2xl inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-8 py-4 bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    id="menu-button"
                    aria-expanded="true"
                    aria-haspopup="true"
                    onClick={() => setOpen(!isOpen)}
                >
                    {label}
                    <svg
                        className="-mr-1 ml-2 h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <div
                className="z-30 origin-top-right absolute right-0 my-6 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
                hidden={!isOpen}
            >
                <div className="py-1" role="none">
                    {children}
                </div>
            </div>
        </div>
    );
};
