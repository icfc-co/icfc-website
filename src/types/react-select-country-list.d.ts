declare module 'react-select-country-list' {
  type Country = { value: string; label: string };
  export default function countryList(): { getData(): Country[]; getLabel(value: string): string; getValue(label: string): string };
}
