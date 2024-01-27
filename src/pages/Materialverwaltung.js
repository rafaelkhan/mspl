import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import {
    Table,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    TextField,
    Box,
    Button,
    IconButton,
    Input,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Snackbar,
    Checkbox,
    FormControlLabel,
    ListItemText
} from '@mui/material';
import EditMaterialDialog from './EditMaterialDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Sidebar from '../Components/Sidebar';
import '../CSS/Materialverwaltung.css';
import '../CSS/Sidebar.css';


function Materialverwaltung() {
    const [materialien, setMaterialien] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bestaende, setBestaende] = useState({});
    const [occupiedBoxes, setOccupiedBoxes] = useState([]);
    const [boxAssignments, setBoxAssignments] = useState({});
    const [schulKlassen, setSchulKlassen] = useState([]);
    const [materialAccess, setMaterialAccess] = useState({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [currentEditMaterial, setCurrentEditMaterial] = useState(null);


    useEffect(() => {
        axios.get('/api/Materialtyp').then(response => {
            setMaterialien(response.data);
        }).catch(error => console.error('Fehler beim Abrufen der Materialdaten:', error));

        axios.get('/api/Materialtyp/Box').then(response => {
            const bestandObj = {};
            const initialBoxAssignments = {};
            response.data.forEach(box => {
                bestandObj[box.MaterialtypID] = box.Menge;
                initialBoxAssignments[box.MaterialtypID] = box.BoxID;
            });
            setBestaende(bestandObj);
            setBoxAssignments(initialBoxAssignments);
        }).catch(error => console.error('Fehler beim Abrufen des aktuellen Bestands:', error));

        axios.get('/api/schulklassen').then(response => {
            setSchulKlassen(response.data);
        }).catch(error => console.error('Fehler beim Abrufen der Schulklassen:', error));

        axios.get('/api/Materialtyp/occupiedBoxes').then(response => {
            setOccupiedBoxes(response.data);
        }).catch(error => console.error('Fehler beim Abrufen besetzter Boxen:', error));
    }, []);

    useEffect(() => {
        const fetchAccessRights = async () => {
            try {
                const responses = await Promise.all(
                    materialien.map(material =>
                        axios.get(`/api/Materialtyp/access/${material.MaterialtypID}`)
                    )
                );

                const newMaterialAccess = responses.reduce((acc, response, index) => {
                    const materialId = materialien[index].MaterialtypID;
                    acc[materialId] = response.data.map(access => access.Schulklasse);
                    return acc;
                }, {});

                setMaterialAccess(newMaterialAccess);
            } catch (error) {
                console.error('Fehler beim Abrufen der Zugriffsrechte:', error);
            }
        };

        if (materialien.length > 0) {
            fetchAccessRights();
        }
        materialien.forEach(material => {
            axios.get(`/api/Materialtyp/access/${material.MaterialtypID}`)
                .then(response => {
                    setMaterialAccess(prev => ({
                        ...prev,
                        [material.MaterialtypID]: response.data.map(access => access.Schulklasse)
                    }));
                })
                .catch(error => console.error('Fehler beim Abrufen der Zugriffsrechte:', error));
        });
    }, [materialien]);

    const handleEdit = (materialId) => {
        const materialToEdit = materialien.find(material => material.MaterialtypID === materialId);
        setCurrentEditMaterial(materialToEdit);
        setEditDialogOpen(true);
    };

    const updateMaterial = async (materialData) => {
        try {
            const response = await axios.put(`/api/Materialtyp/update/${materialData.MaterialtypID}`, materialData);
            if (response.status === 200) {
                console.log('Material und seine Attribute erfolgreich aktualisiert');
                setMaterialien(materialien.map(material => {
                    if (material.MaterialtypID === materialData.MaterialtypID) {
                        return {...material, ...materialData};
                    }
                    return material;
                }));
                setEditDialogOpen(false);
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Materials', error);
        }
    };

    const deleteMaterial = async (id) => {
        const currentStock = bestaende[id];
        if (currentStock > 0) {
            setSnackbarMessage('Bitte entfernen Sie das Material aus dem Bestand, bevor Sie es löschen.');
            setSnackbarOpen(true);
            return;
        }
        await axios.delete(`/api/Materialtyp/delete/${id}`);
        const response = await axios.get('/api/Materialtyp');
        setMaterialien(response.data);
        axios.get('/api/Materialtyp/occupiedBoxes').then(response => {
            setOccupiedBoxes(response.data);
        }).catch(error => console.error('Fehler beim Abrufen besetzter Boxen:', error));
    };

    const updateTargetStock = async (materialId, newTargetStock) => {
        await axios.put(`/api/Materialtyp/${materialId}/updateTargetStock`, {newTargetStock});
        const response = await axios.get('/api/Materialtyp');
        setMaterialien(response.data);
    };

    const updateBoxStock = async (materialtypId, newStock) => {
        const response = await axios.put(`/api/Materialtyp/Box/updateStock`, {materialtypId, newStock});
        if (response.status === 200) {
            setBestaende(prevBestaende => ({
                ...prevBestaende,
                [materialtypId]: parseInt(newStock)
            }));
        }
    };

    const updateBoxAssignment = (materialId, newBoxId) => {
        setBoxAssignments(prev => ({...prev, [materialId]: newBoxId}));
        axios.put('/api/Materialtyp/updateBoxAssignment', {materialtypId: materialId, boxId: newBoxId})
            .then(response => console.log('Box-Zuweisung erfolgreich aktualisiert'))
            .catch(error => console.error('Fehler beim Aktualisieren der Box-Zuweisung', error));
        axios.get('/api/Materialtyp/occupiedBoxes').then(response => {
            setOccupiedBoxes(response.data);
        }).catch(error => console.error('Fehler beim Abrufen besetzter Boxen:', error));
    };

    const handleStockChange = (materialId, newValue, updateFunction) => {
        if (newValue !== "") {
            updateFunction(materialId, newValue);
        }
    };

    const handleKeyDown = (event, materialId, updateFunction) => {
        if (event.key === 'Enter') {
            handleStockChange(materialId, event.target.value, updateFunction);
            event.target.blur();
        }
    };

    const filteredMaterialien = materialien.filter(material =>
        material.Bezeichnung.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.MaterialtypID.toString().includes(searchTerm.toLowerCase())
    );

    const renderSchulklasseAccess = (materialId) => {
        const hasAccess = materialAccess[materialId] && materialAccess[materialId].length > 0;
        return (
            <FormControl sx={{width: '200px'}}>
                <Select
                    multiple
                    displayEmpty // Damit der Platzhalter immer angezeigt wird
                    value={hasAccess ? materialAccess[materialId] : []}
                    onChange={(e) => handleMaterialAccessChange(materialId, e)}
                    renderValue={(selected) => selected.length > 0 ? selected.join(', ') : 'Noch nicht zugeteilt'}
                >
                    {schulKlassen.map((klasse) => (
                        <MenuItem key={klasse.Schulklasse} value={klasse.Schulklasse}>
                            <Checkbox checked={hasAccess && materialAccess[materialId].includes(klasse.Schulklasse)}/>
                            <ListItemText primary={klasse.Schulklasse}/>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    };
    const handleMaterialAccessChange = async (materialId, event) => {
        const updatedAccess = {
            ...materialAccess,
            [materialId]: event.target.value
        };
        setMaterialAccess(updatedAccess);

        const currentAccess = materialAccess[materialId] || [];
        const newAccess = event.target.value;

        const accessToAdd = newAccess.filter(x => !currentAccess.includes(x));
        const accessToRemove = currentAccess.filter(x => !newAccess.includes(x));

        try {
            // Hinzufügen neuer Rechte
            if (accessToAdd.length > 0) {
                await axios.post(`/api/Materialtyp/access/${materialId}`, {schulklassen: accessToAdd});
            }

            // Entfernen nicht mehr benötigter Rechte
            if (accessToRemove.length > 0) {
                await axios.delete(`/api/Materialtyp/access/${materialId}`, {data: {schulklassen: accessToRemove}});
            }

            setSnackbarMessage('Zugriffsrechte erfolgreich aktualisiert.');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Zugriffsrechte:', error);
            setSnackbarMessage('Fehler beim Aktualisieren der Zugriffsrechte.');
            setSnackbarOpen(true);
        }
    };

    return (

        <div className="flexContainer">

            <Sidebar/>

            <h1 className="sidebar-header">Materialverwaltung</h1>


            <div className="search-box-div">
                <Box className="search-box-box">
                    <TextField
                        id="outlined-search"
                        label="Suche nach Name oder ID"
                        type="search"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                    />
                </Box>
            </div>

            <div>
                <Box className="newMaterial-box">
                    <Link to="/newmaterial">
                        <Button fullWidth variant="outlined">
                            Neues Material hinzufügen
                        </Button>
                    </Link>
                </Box>
            </div>

            <div className="paper-div">
                <Paper className="paper-container">
                    <TableContainer component={Paper} className="table-container">
                        <Table>
                            <TableHead>
                                <TableRow className="sticky-header">
                                    <TableCell>ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell className="table-cell-center">Soll-Bestand</TableCell>
                                    <TableCell className="table-cell-center">Aktueller Bestand</TableCell>
                                    <TableCell className="table-cell-center">Box</TableCell>
                                    <TableCell className="table-cell-center">Zugriffsrechte</TableCell>
                                    <TableCell className="table-cell-center">Bearbeiten</TableCell>
                                    <TableCell className="table-cell-center">Löschen</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredMaterialien.map(material => (
                                    <TableRow key={material.MaterialtypID}>
                                        <TableCell>{material.MaterialtypID}</TableCell>
                                        <TableCell>{material.Bezeichnung}</TableCell>
                                        <TableCell className="table-cell-center">
                                            <Input
                                                type="number"
                                                defaultValue={material.SollBestand}
                                                onBlur={(e) => handleStockChange(material.MaterialtypID, e.target.value, updateTargetStock)}
                                                onKeyDown={(e) => handleKeyDown(e, material.MaterialtypID, updateTargetStock)}
                                            />
                                        </TableCell>
                                        <TableCell className="table-cell-center">
                                            <Input
                                                key={material.MaterialtypID + '-' + (bestaende[material.MaterialtypID] || 0)}
                                                type="number"
                                                defaultValue={bestaende[material.MaterialtypID] || 0}
                                                onBlur={(e) => handleStockChange(material.MaterialtypID, e.target.value, updateBoxStock)}
                                                onKeyDown={(e) => handleKeyDown(e, material.MaterialtypID, updateBoxStock)}
                                            />
                                        </TableCell>
                                        <TableCell className="table-cell-center">
                                            <FormControl fullWidth className="select-container">
                                                <Select
                                                    value={boxAssignments[material.MaterialtypID] || ''}
                                                    onChange={(e) => updateBoxAssignment(material.MaterialtypID, e.target.value)}
                                                >
                                                    {Array.from({length: 208}, (_, i) => i + 1).map(boxId => (
                                                        <MenuItem key={boxId} value={boxId}
                                                                  disabled={occupiedBoxes.includes(boxId) && boxAssignments[material.MaterialtypID] !== boxId}>
                                                            {`Box ${boxId}`}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell className="table-cell-center">
                                            {renderSchulklasseAccess(material.MaterialtypID)}
                                        </TableCell>
                                        <TableCell className="table-cell-center">
                                            <IconButton onClick={() => handleEdit(material.MaterialtypID)}>
                                                <EditIcon/>
                                            </IconButton>
                                        </TableCell>
                                        <TableCell className="table-cell-center">
                                            <IconButton onClick={() => deleteMaterial(material.MaterialtypID)}>
                                                <DeleteIcon/>
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </div>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
            <EditMaterialDialog
                open={editDialogOpen}
                handleClose={() => setEditDialogOpen(false)}
                materialData={currentEditMaterial}
                updateMaterial={updateMaterial}
            />

        </div>
    );
}

export default Materialverwaltung;
