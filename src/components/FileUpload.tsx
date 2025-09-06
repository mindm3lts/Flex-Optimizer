import React, { useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onFileChange: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onFileChange(Array.from(files));
    }
  }, [onFileChange]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileChange(Array.from(files));
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center">
      <div className="w-full">
        <label
          htmlFor="file-upload"
          className="relative block w-full rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 p-12 text-center hover:border-cyan-500 dark:hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors duration-300 cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <span className="mt-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
            Drop screenshots here, or click to upload
          </span>
        </label>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelect}
          multiple
        />
      </div>
    </div>
  );
};
