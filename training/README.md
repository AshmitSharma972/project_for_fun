# Online-GPU classifier training

This is optional synthetic-data experimentation, not Hindsight training and not
a source of production outcome statistics. Run it in Google Colab or Kaggle.

```bash
python training/generate_synthetic_incidents.py --rows 100000
pip install -r training/requirements-online-gpu.txt
python training/train_online_gpu.py --data data/synthetic_incidents_100k.jsonl
```

Use a GPU runtime. Do not present the resulting classifier's accuracy as
production performance: its data is synthetic. Hindsight remains the only
persistent memory layer in IncidentMind.
