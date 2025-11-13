# Monitoramento - Backend (Fase 4 / 5)

Estrutura mínima criada em `backend/`:

- `main.py` - FastAPI app que recebe upload de CSV, carrega `models/model_anomalia.pkl` e classifica cada linha como `Normal` ou `Anomalia`.
- `models/` - onde o `model_anomalia.pkl` deve ser colocado.
- `templates/` - templates Jinja2 (`index.html`, `results.html`).
- `static/` - CSS.
- `create_dummy_model.py` - script para gerar um modelo de exemplo e um `baseline.csv` para testes.
- `requirements.txt` - dependências Python.

Como rodar (PowerShell):

```powershell
cd .\meu-projeto\backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# opcional: criar modelo de teste
python create_dummy_model.py
# rodar o servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Uso:
- Abra `http://127.0.0.1:8000` no navegador.
- Faça upload de um CSV com colunas numéricas (por exemplo `elapsed` ou outras métricas do JMeter).
- O backend carrega `model_anomalia.pkl` em `backend/models/` e retorna uma página com a porcentagem de anomalias e um gráfico de latência se detectado.

Notas:
- O código tenta alinhar as colunas numéricas com `model.feature_names_in_` se disponível; caso contrário usa as colunas numéricas do CSV.
- Se `model_anomalia.pkl` não for um detector conhecido, o app exibirá um erro explicativo.
