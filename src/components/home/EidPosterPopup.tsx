import React, { useEffect, useState } from "react";

interface EidPosterPopupProps {
  onClose: () => void;
}

const posterImage = "/images/eid-poster.jpg"; // Place your poster image in public/images/

const EidPosterPopup: React.FC<EidPosterPopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-4">
        <button
          className="absolute top-2 right-2 text-gray-700 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close poster"
        >
          &times;
        </button>
        <img
          src={posterImage}
          alt="Eid Prayer Poster"
          className="w-full h-auto rounded mb-4"
        />
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Eid Prayer Timings</h2>
          <p className="mb-1">Eid al-Fitr 2026</p>
          <p className="mb-1">Date: March 20, 2026</p>
          <p className="mb-1">First Prayer: 7:30 AM</p>
          <p className="mb-1">Second Prayer: 9:00 AM</p>
          <p className="mb-1">Location: ICFC Main Hall</p>
        </div>
      </div>
    </div>
  );
};

export default EidPosterPopup;
