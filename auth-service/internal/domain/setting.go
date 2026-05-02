package domain

type Setting struct {
	Key   string `json:"key" gorm:"primaryKey;type:varchar(100)"`
	Value string `json:"value" gorm:"type:text"`
}