export type ConnectorId = "sharepoint" | "gdrive" | "onedrive" | "s3";

export type ConnectorDescriptor = {
  id: ConnectorId;
  label: string;
  iconSrc: string;
  onSelect: () => void;
};