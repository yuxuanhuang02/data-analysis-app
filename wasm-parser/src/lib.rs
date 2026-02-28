use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use byteorder::{LittleEndian, ReadBytesExt};
use std::io::Cursor;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct BlfHeader {
    pub version: u32,
    pub file_size: u64,
    pub object_count: u32,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct BlfObjectHeader {
    pub obj_type: u32,
    pub obj_size: u32,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct BlfParser {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl BlfParser {
    #[wasm_bindgen(constructor)]
    pub fn new(data: Vec<u8>) -> BlfParser {
        BlfParser { data }
    }

    pub fn parse_header(&self) -> Result<JsValue, JsValue> {
        let mut rdr = Cursor::new(&self.data);
        
        let mut sig = [0u8; 4];
        if rdr.read_exact(&mut sig).is_err() || &sig != b"LOGG" {
            return Err(JsValue::from_str("Invalid BLF signature"));
        }

        rdr.set_position(12); // Skip reserved
        let version = rdr.read_u32::<LittleEndian>().unwrap_or(0);
        rdr.set_position(32);
        let file_size = rdr.read_u64::<LittleEndian>().unwrap_or(0);
        rdr.set_position(44);
        let object_count = rdr.read_u32::<LittleEndian>().unwrap_or(0);

        let header = BlfHeader {
            version,
            file_size,
            object_count,
        };

        serde_wasm_bindgen::to_value(&header).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn get_objects_summary(&self) -> Result<JsValue, JsValue> {
        let mut objects = Vec::new();
        let mut pos = 144; // Start of objects in typical BLF

        while pos + 16 <= self.data.len() {
            let mut rdr = Cursor::new(&self.data[pos..]);
            let obj_sig = rdr.read_u32::<LittleEndian>().unwrap_or(0);
            if obj_sig != 0x4A424F4C { // "LOBJ"
                break;
            }
            
            rdr.set_position(8);
            let obj_size = rdr.read_u32::<LittleEndian>().unwrap_or(0);
            let obj_type = rdr.read_u32::<LittleEndian>().unwrap_or(0);
            
            // Simplified timestamp extraction
            objects.push(BlfObjectHeader {
                obj_type,
                obj_size,
                timestamp: 0, 
            });

            if obj_size == 0 { break; }
            pos += obj_size as usize;
        }

        serde_wasm_bindgen::to_value(&objects).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}
