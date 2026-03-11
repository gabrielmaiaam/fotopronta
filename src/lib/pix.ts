/**
 * Generates a PIX Static Payload (BR Code) following the EMV specification
 * defined by the Central Bank of Brazil.
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(payload);
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(value: string, maxLen: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 @.\-]/g, "")
    .substring(0, maxLen)
    .toUpperCase();
}

export function generatePixPayload(
  chavePix: string,
  nomeRecebedor: string,
  cidade: string
): string {
  // ID 00 - Payload Format Indicator
  const id00 = tlv("00", "01");

  // ID 26 - Merchant Account Information (PIX)
  const gui = tlv("00", "br.gov.bcb.pix");
  const chave = tlv("01", chavePix);
  const id26 = tlv("26", gui + chave);

  // ID 52 - Merchant Category Code
  const id52 = tlv("52", "0000");

  // ID 53 - Transaction Currency (986 = BRL)
  const id53 = tlv("53", "986");

  // ID 58 - Country Code
  const id58 = tlv("58", "BR");

  // ID 59 - Merchant Name
  const id59 = tlv("59", sanitize(nomeRecebedor || "RECEBEDOR", 25));

  // ID 60 - Merchant City
  const id60 = tlv("60", sanitize(cidade || "CIDADE", 15));

  // ID 62 - Additional Data Field (txid)
  const txid = tlv("05", "***");
  const id62 = tlv("62", txid);

  // Assemble without CRC
  const payloadWithoutCrc = id00 + id26 + id52 + id53 + id58 + id59 + id60 + id62 + "6304";

  // ID 63 - CRC16
  const checksum = crc16(payloadWithoutCrc);

  return payloadWithoutCrc + checksum;
}
