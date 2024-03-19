# Graph Table Converter
The Graph Table Converter is a temporary utility designed to transform Graph data, represented in various CSV formats, into relational data. This data is then indexed within Elastic Search (`ES`). 

## Important Notice
This utility is intended as a stopgap solution. It will become obsolete and should be deprecated in favor of a more robust ingest and storage service once available.

## Setup Instructions
1. **Start Docker Containers**  
Initialize the Docker containers required for the project. It is important to wait until the `ES` instance has fully booted up before proceeding.

```bash
docker compose up -d
```

2. **Install Node Modules**
```bash
pnpm install
```

3. **Prepare Data Sources**  
Create a directory named `data_sources` in the project root. This directory will hold the CSV files (or similar formats) that contain the Graph data to be converted and indexed.
```bash
mkdir data_sources
```

4. **Configure Environment Variables**  
Duplicate the `.env.example` file and rename the copy to `.env`. Then, modify the `.env` file to set the environment variables according to **your** setup.
```bash
cp .env.example .env
```

5. **Start the Ingest and Index Process**
```bash
pnpm start
```

- **(Optional) JSON Dump**  
In cases where you would like to inspect the converted CSV files, you can simply run this, and it generates a `json` directory with the converted files.
```bash
pnpm start:json
```

